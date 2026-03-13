/**
 * Thinking Companion Prompt — Phase 2
 * Echo/Sense/Next response format with safety guardrails + sensitive topic detection
 */

import { SessionMemory, QuestionRating, preprocessTranscript } from './round-question-prompt';
import { CRISIS_RESOURCES, CRISIS_FALLBACK_TEXT } from '../config/crisis-resources';

// --- Summary V2 Types ---

export interface SummaryResponseV2 {
  version: 2;
  journey: {
    start_quote: string;
    shift: string;
    end_quote: string;
  };
  awareness: string;
  next_step: {
    type: 'action' | 'question' | 'invitation';
    content: string;
  };
}

export interface RoundData {
  round_number: number;
  transcript: string;
  echo: string;
  sense: string;
  next: string;
}

// --- Types ---

export type ModeHint = 'structure' | 'release' | 'depth';

export interface ModePair {
  primary: ModeHint;
  secondary?: ModeHint;
}

export interface TurnResponseV2 {
  echo: string;
  sense: string;
  next: string;
  maybe: string | null;  // Phase 7
  mode: ModePair;
  memory: SessionMemory;
  is_crisis: boolean;
  depth_level: 1 | 2 | 3;  // Phase 6
}

// --- Crisis Detection (2-tier regex safety net) ---

export interface CrisisSignal {
  highConfidence: boolean;
  lowConfidence: boolean;
  matchedPatterns: string[];
}

const HIGH_CONFIDENCE_PATTERNS: { label: string; pattern: RegExp }[] = [
  // 既存16パターン
  { label: '死にたい', pattern: /死にたい/ },
  { label: '死のう', pattern: /死のう/ },
  { label: '自殺', pattern: /自殺/ },
  { label: '自傷', pattern: /自傷/ },
  { label: '消えたい', pattern: /消えたい/ },
  { label: '消えてしまいたい', pattern: /消えてしまいたい/ },
  { label: 'いなくなりたい', pattern: /いなくなりたい/ },
  { label: '生きていたくない', pattern: /生きていたくない/ },
  { label: '生きる意味', pattern: /生きる意味/ },
  { label: 'もう限界', pattern: /もう限界/ },
  { label: 'もう無理', pattern: /もう無理/ },
  { label: '楽になりたい', pattern: /楽になりたい/ },
  { label: '殺して', pattern: /殺して/ },
  { label: '首を吊', pattern: /首を吊/ },
  { label: '飛び降り', pattern: /飛び降り/ },
  { label: 'リスカ', pattern: /リスカ/ },
  { label: 'ODし', pattern: /ODし/ },
  // Phase 2 追加
  { label: '手首.*切', pattern: /手首.*切/ },
  { label: '眠ったまま.*起き', pattern: /眠ったまま.*起き/ },
];

const LOW_CONFIDENCE_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: '生まれてこなければ', pattern: /生まれてこなければ/ },
  { label: '全部終わらせたい', pattern: /全部終わらせたい/ },
  { label: 'もう終わりにしたい', pattern: /もう終わりにしたい/ },
  { label: 'この世から', pattern: /この世から/ },
  { label: 'もういい.*生き', pattern: /もういい.*生き/ },
  { label: 'kill me', pattern: /kill\s*(my|me)/i },
  { label: 'want to die', pattern: /want\s*to\s*die/i },
  { label: 'suicide', pattern: /suicide/i },
];

export function detectCrisisRegex(text: string): CrisisSignal {
  const matches: string[] = [];

  for (const { label, pattern } of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) matches.push(`high:${label}`);
  }
  const highConfidence = matches.length > 0;

  for (const { label, pattern } of LOW_CONFIDENCE_PATTERNS) {
    if (pattern.test(text)) matches.push(`low:${label}`);
  }
  const lowConfidence = matches.some((m) => m.startsWith('low:'));

  return {
    highConfidence,
    lowConfidence,
    matchedPatterns: Array.from(new Set(matches)).sort(),
  };
}

// --- Crisis Fixed Response (Phase 2: improved tone + configurable resources) ---

export function generateCrisisResponse(transcript: string): TurnResponseV2 {
  const sentences = transcript
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  const lastPhrase = sentences[sentences.length - 1] || '';

  // Echo: 短い発話かどうかでトーンを変える
  const echo = lastPhrase.length > 5
    ? `そう思っているんですね。聞かせてくれて、ありがとうございます。`
    : `つらい気持ちの中で、声にしてくれたこと、ありがとうございます。`;

  // Sense
  const sense = 'そのくらいしんどい状況にいるんだと思います。一人で抱えなくて大丈夫です。';

  // Next: verified resources の上位2件、なければ fallback
  const verifiedResources = CRISIS_RESOURCES.filter((r) => r.verified === true);
  let next: string;
  if (verifiedResources.length > 0) {
    const resourceTexts = verifiedResources
      .slice(0, 2)
      .map((r) => `${r.name}（${r.contact}）`)
      .join('、');
    next = `今すぐ話を聞いてくれる人がいます。${resourceTexts}にいつでも電話できます。`;
  } else {
    next = CRISIS_FALLBACK_TEXT;
  }

  return {
    echo,
    sense,
    next,
    maybe: null,
    mode: { primary: 'release' },
    memory: {
      working_hypothesis: null,
      open_loops: [],
      core_tension: null,
      recent_question_angle: 'emotion',
      current_depth: 1,
    },
    is_crisis: true,
    depth_level: 1 as const,
  };
}

// --- Sensitive Topic Detection (Step 4) ---

export type SensitiveTopicResult =
  | { detected: false; topicLabel: null; guardrail: null }
  | { detected: true; topicLabel: string; guardrail: 'gentle_empathy' | 'soft_empathy' };

const SENSITIVE_TOPIC_PATTERNS: { label: string; guardrail: 'gentle_empathy' | 'soft_empathy'; patterns: RegExp[] }[] = [
  // gentle_empathy: 重い話題。分析禁止、共感のみ
  { label: '大切な人との別れ', guardrail: 'gentle_empathy', patterns: [/亡くなっ/, /他界/, /死んでしまっ/, /お葬式/, /遺族/] },
  { label: '対人関係の困難', guardrail: 'gentle_empathy', patterns: [/虐待/, /暴力.*受け/, /DV/, /パワハラ/, /セクハラ/, /いじめ/] },
  { label: '健康上の懸念', guardrail: 'gentle_empathy', patterns: [/がん.*診断/, /余命/, /入院/, /手術.*控え/, /難病/] },
  // soft_empathy: 生活変化系。共感優先だが軽い整理は許容
  { label: '関係性の変化', guardrail: 'soft_empathy', patterns: [/離婚/, /別れた/, /振られ/, /出ていっ/, /親権/] },
  { label: '仕事の変化', guardrail: 'soft_empathy', patterns: [/解雇/, /クビ/, /リストラ/, /倒産/, /失業/] },
];

export function detectSensitiveTopic(text: string): SensitiveTopicResult {
  for (const topic of SENSITIVE_TOPIC_PATTERNS) {
    if (topic.patterns.some((p) => p.test(text))) {
      return { detected: true, topicLabel: topic.label, guardrail: topic.guardrail };
    }
  }
  return { detected: false, topicLabel: null, guardrail: null };
}

// --- PullBack Detection (Step 5: 2-of-3) ---

export interface PullBackSignal {
  detected: boolean;
  signals: { shortResponse: boolean; offRating: boolean; deflection: boolean };
}

const DEFLECTION_PATTERNS = [
  /まあいいか/, /別に/, /大したことない/, /なんでもない/,
  /話変わるけど/, /それより/, /どうでもいい/, /気にしてない/,
];

export function detectPullBack(
  transcript: string,
  roundNumber: number,
  previousRatings: (QuestionRating | null)[],
): PullBackSignal {
  const shortResponse = roundNumber >= 2 && transcript.length < 30;

  // 前回ラウンドの rating。null は中立、カウントしない
  const lastRating = previousRatings.length > 0 ? previousRatings[previousRatings.length - 1] : null;
  const offRating = lastRating === 'off';

  const deflection = DEFLECTION_PATTERNS.some((p) => p.test(transcript));

  const signals = { shortResponse, offRating, deflection };
  const count = [shortResponse, offRating, deflection].filter(Boolean).length;

  return { detected: count >= 2, signals };
}

// --- Guardrail Profile (Step 3) ---

export type GuardrailMode = 'gentle_empathy' | 'soft_empathy' | 'soft_reorient' | 'standard';
export type GuardrailModeLog = 'crisis_fixed' | GuardrailMode;

export function resolveGuardrail(
  sensitiveTopic: SensitiveTopicResult,
  pullBack: PullBackSignal,
): GuardrailMode {
  if (sensitiveTopic.detected) return sensitiveTopic.guardrail;
  if (pullBack.detected) return 'soft_reorient';
  return 'standard';
}

function buildGuardrailConstraint(mode: GuardrailMode, topicLabel: string | null): string {
  switch (mode) {
    case 'gentle_empathy':
      return `\n## 応答制約: gentle_empathy（${topicLabel}）
Echo: 感情を短く受け止める / Sense: 仮説1つまで、因果説明しない / Next: 招待型のみ（「もしよければ」）
分析・構造化・リフレーミング禁止
深度: Depth 1固定\n`;

    case 'soft_empathy':
      return `\n## 応答制約: soft_empathy（${topicLabel}）
Echo: 感情や状況を短く受け止める / Sense: 仮説1つまで、因果説明しない / Next: 選択肢型、助言禁止・原因分析禁止・整理しすぎた説明禁止
深度: Depth 1固定\n`;

    case 'soft_reorient':
      return `\n## 応答制約: soft_reorient
深掘り禁止 / 対象・時間軸・抽象度のどれかを必ず変える / 同じ論点の言い換え再質問禁止 / Nextは一問だけ、説明を足さない
深度: Depth 1固定\n`;

    case 'standard':
      return '';
  }
}

// --- Context Builder (V2: includes mode/depth context) ---

export function buildContextV2(
  transcript: string,
  memory: SessionMemory | null,
  roundNumber: number,
  previousQuestions: string[],
  previousRatings?: (QuestionRating | null)[],
): string {
  const processed = preprocessTranscript(transcript);
  let ctx = `## ラウンド: ${roundNumber} / 3\n\n`;

  if (previousQuestions?.length > 0) {
    ctx += `## 前のラウンド:\n`;
    ctx += previousQuestions
      .map((q, i) => {
        const rating = previousRatings?.[i];
        return rating
          ? `- R${i + 1} question: ${q} → 評価: ${rating}`
          : `- R${i + 1}: ${q}`;
      })
      .join('\n');
    ctx += '\n\n';

    if (previousRatings?.some((r) => r != null)) {
      ctx += `## 評価の解釈:\n`;
      ctx += `- "forward" → 同系統で一段深く\n`;
      ctx += `- "neutral" → 角度か抽象度を少し変える\n`;
      ctx += `- "off" → 同じangleを避け、より具体かより安全な切り口に戻す\n\n`;
    }
  }

  if (memory) {
    ctx += `## 現在のメモリ:\n`;
    if (memory.working_hypothesis) ctx += `- working_hypothesis: ${memory.working_hypothesis}\n`;
    if (memory.open_loops?.length > 0) ctx += `- open_loops: ${memory.open_loops.join('、')}\n`;
    if (memory.core_tension) ctx += `- core_tension: ${memory.core_tension}\n`;
    ctx += `- recent_question_angle: ${memory.recent_question_angle}\n`;
    if (memory.current_depth) ctx += `- current_depth: ${memory.current_depth}\n`;
    if (memory.previous_had_maybe) ctx += `- previous_had_maybe: true（前ラウンドでMaybeを出したため、今回はmaybeをnullにすること）\n`;
    ctx += '\n';
  }

  ctx += `## 文字起こし（最新1000文字）:\n${processed}`;
  return ctx;
}

// --- Main Prompt (Step 6: guardrail injection) ---

/**
 * Fallback は安全な最低保証。無害性優先。
 * 通常応答より賢く見せようとしない。
 * 解釈ではなく、続けやすい余白を返す。
 *
 * この原則はプロンプト設計全体にも適用される:
 * - Echo はユーザーの原文語彙を返す（AI語彙への翻訳禁止）
 * - Sense は仮説形で、断定しない
 * - Next はトピック非依存の問いで、特定ドメインを仮定しない
 */
export function buildRerollConstraint(previousQuestion: string, previousAngle: string): string {
  return `\n## リロール制約
前回の問い「${previousQuestion}」(angle: ${previousAngle}) はユーザーに合いませんでした。
以下を厳守:
- ${previousAngle} 以外のangleを選ぶこと
- 同じテーマ・切り口の言い換え禁止
- 同じ主語構造・同じ時間軸の再利用禁止
- 問いの切り口も変えること（例: 前回が原因探索なら対象の切り分けや優先順位へ、二択なら具体場面や時間軸へ）\n`;
}

export function buildThinkingCompanionPrompt(
  context: string,
  roundNumber: number,
  guardrailMode: GuardrailMode = 'standard',
  topicLabel: string | null = null,
  rerollConstraint?: string,
): string {
  const scopeGuide =
    roundNumber === 1
      ? `**探索（Depth 1固定）**: 最も感情が乗っている部分 or 最も曖昧な部分を特定する。
テクニック: 対比（AとBどちらが近い？）、具体化（例えば？）、時間軸（いつから？）`
      : roundNumber === 2
        ? `**深掘り**: 構造的な障壁・矛盾・トレードオフに焦点を当てる。
テクニック: 仮定の排除（もしXがなかったら？）、他者視点（相手はどう見ている？）、本音確認（本当はどうしたい？）`
        : `**収束**: 動けるようになる問いを投げる。
テクニック: 最小ステップ（今日中にできる一歩は？）、判断基準（何が決まれば動ける？）、コミット（誰に宣言する？）`;

  const guardrailConstraint = buildGuardrailConstraint(guardrailMode, topicLabel);

  return `あなたは静かな伴走者です。ユーザーが声で考えを話しています。
あなたの役割は、鏡のように映し返し、まだ言語化されていない部分に静かに光を当てること。

## 核心ルール
1. **Echo（最重要）**: ユーザーの**原文の言葉**を使って「わかっている」を伝える。AIの語彙に翻訳しない。「モヤモヤ」と言ったら「モヤモヤ」を使う。1-2文。
2. **Sense**: ユーザーの言葉の中から、まだ本人が気づいていないパターンや接続を浮かび上がらせる。「整理された説明」ではない。常に仮説形（「〜のように聞こえます」「〜が見えてきた気がします」）。断定禁止。1-2文。
3. **Next**: 思考を次に進める問い。1つだけ。二択 or 一点絞り込み型を優先。

## 安全ガードレール
- ユーザーが自傷・深刻な苦痛・危機的な表現をしている場合:
  - is_crisis を true にする
  - echo: 共感のみ
  - sense: 「あなたが感じていることは重要なサインです」
  - next: 専門リソース案内（いのちの電話: 0570-783-556、よりそいホットライン: 0120-279-338）
  - 分析・深掘り一切禁止

## 感情的トピックへの対応
- **怒り・悲しみ・不安が強い発話の場合**:
  - Senseは断定を避ける（「〜のように聞こえます」「〜かもしれません」のみ）
  - Nextは柔らかい招待型にする（「もしよければ」「話せる範囲で」を添える）
  - 構造的な整理や分析に急がない
- **ユーザーが浅い話題を選んでいる場合**:
  - 追従する。深掘りを避けている兆候（話題転換、短い返答、表面的な話）があれば、Nextは角度を変えて別の入口を提供する
  - 無理に深層に引き込まない

## mode（方向感）— 生成手順と分岐ルール

**guardrail との優先関係:**
crisis_fixed > gentle_empathy > soft_empathy > soft_reorient > mode rules
guardrail が発動している場合、mode ルールは guardrail の制約の**内側でのみ**効く。
例: gentle_empathy + structure → Echo は感情を短く受け止める（guardrail優先）が、Next は guardrail の範囲内で選択肢寄りに（mode が微調整）。guardrail が「分析禁止」なら mode の structure ルールのうち「トレードオフを浮かべる」は無効化される。

### Step 1: modeを先に決める（判定優先順位に従う）
ユーザーの発話を読み、以下の優先順位でprimaryを1つ決定する。secondaryはあれば1つ。

**判定優先順位（上から順に判定、最初に該当したものがprimary）:**
1. 明示的な選択肢・比較・条件・期限・「誰に何を」がある → **structure**
2. 反復パターン・前提・「いつも/結局/本当は」が主題 → **depth**
3. 上記に該当せず、感情の吐き出しが中心 → **release**

mixed utterance（「AとBで迷ってる。もう疲れた」等）は、感情語があっても選択肢・比較が含まれていれば structure。感情語の有無ではなく、発話の主題で判断する。

### Step 2: primaryに従ってecho/sense/nextを生成する

**全mode共通: Senseは必ず仮説形1文**（「〜のように聞こえます」「〜かもしれません」）。断定禁止。

**structure時のルール:**
- Echo: ユーザーが挙げた選択肢・条件・登場人物を原文語彙で並べ返す
- Sense: トレードオフか制約を仮説形で1つ（「〜と〜のトレードオフがあるように聞こえます」）
- Next: 優先順位・判断基準・制約条件を絞る比較質問（二択は手段の一つ、三択や条件確認も可）
- 禁止: 「つらいですね」等の感情受容表現 / 「本当は〜」等の内面推測

**release時のルール:**
- Echo: 感情語を原文そのまま返す。要約・整理しない
- Sense: 吐き出した量・強さを俯瞰する仮説形1文。構造化・分類禁止（「〜が積み重なっているように聞こえます」）
- Next: 柔らかい招待型。感情の対象か時間軸を問う
- 禁止: 箇条書き的整理 / 選択肢の提示 / 「つまり〜ということですね」型の要約

**depth時のルール:**
- Echo: 抽象語（「いつも」「結局」「本当は」等）をそのまま拾い返す
- Sense: 繰り返しパターンや暗黙の前提を仮説形1文で提示（「〜というパターンが動いているのかもしれません」）
- Next: パターンの例外・起源・別の見方を問う。持ち帰れる問い
- 禁止: 感情受容だけで終わる / 具体的行動提案 / 選択肢の整理

## 深度レベル（Depth 1-3）— Next の深さ制御

Depth は Next（問い）の深さを決める。Echo と Sense には影響しない。

### Depth判定（mode判定の後に実行）
**Depth 1（デフォルト）**: 事実確認・選択肢整理・状況把握レベルの問い。
**Depth 2**: 構造的矛盾・トレードオフ・「わかっているけど動けない」を浮かび上がらせる問い。
**Depth 3**: 前提・信念・繰り返しパターン・「自分はこういう人間だ」に触れる問い。

### Depthを上げてよい条件（すべて満たす場合のみ）:
1. ユーザーの発話の中に以下のシグナルが**主題として**存在する（フィラーや枕詞は除外）
   - Depth 2シグナル: 構造的葛藤（「〜したいけど〜もしたい」「わかってるんだけど」「どっちも正しい」）
   - Depth 3シグナル: 自己参照・パターン言及（「私っていつも」「結局」「本当は」「前も同じことがあった」「毎回こうなる」「〜べきだと思う」「〜な人間だから」）
2. 前ラウンドの current_depth から +1 まで（2段階ジャンプ禁止）
3. R1は Depth 1 固定

### Depthを上げてはいけない場合:
- ユーザーが浅い話題を選んでいる
- シグナルがない
- AIが「本当は深い問題があるはず」と推測している（推測エスカレーション禁止）

### Depth × Next の生成ルール:
- Depth 1: 事実・選択肢・状況を確認する問い
- Depth 2: 構造的障壁・矛盾・「なぜ動けないか」を浮かび上がらせる問い
- Depth 3: パターンの例外・起源・「それは本当にそう？」を問う

### 判定に迷った場合: Depth 1。上げすぎより下げすぎが安全。

## Maybe（仮説スロット）

Maybeは「もしかすると…」形式の仮説。ユーザーがまだ言語化していない接続・動機・前提を提示する。

### いつ出すか（すべて満たす場合のみ — 迷ったら null）:
1. R3である（R1/R2では出さない）
2. Depth 2以上
3. 前のラウンドで Maybe を出していない（previous_had_maybe が true なら null）
4. working_hypothesis か core_tension が存在する（深い文脈が蓄積されている）
5. 前ラウンドも Depth 2 以上だった（浅い文脈から急に仮説を出さない）

### フォーマット（厳守）:
- 始まり: 「もしかすると」「もしかしたら」「ひょっとすると」「ひょっとしたら」のいずれか
- 終わり: 「〜かもしれません」「〜のかもしれません」「〜のかも」「〜かもしれない」「〜のかもしれない」「〜ような気がします」「〜ように思えます」「〜可能性があります」「〜のではないでしょうか」のいずれか
- 1文のみ、60文字以内
- 断定禁止（「〜です」「〜と思います」は不可）
- 疑問文禁止（問いは next の役割）

### Sense との違い:
- Sense: 今の発話のパターンや接続を映す（Echo の延長）
- Maybe: まだ言語化されていない隠れた動機・前提・パターンへの仮説

### 外した時:
- 次のechoでユーザーの実際の発話を自然に映し返すだけ
- 「違ったらすみません」「当たりましたか？」禁止
- Maybeが外れたかどうかに言及しない

### 出さない場合（大半のターン）:
- maybe: null を返す。これが正常。

## 質問の規範
- 広すぎる質問禁止（「それについてどう思いますか？」等）
- 「なぜ」単独禁止、「どう思う」単独禁止
- yes/no禁止
- 1問のみ
- 直前の話題に接続すること
- 同じangleの連続禁止
- 既に答えた内容への再質問禁止
- 質問形は**二択 or 一点絞り込み型**を優先

## このラウンドの質問戦略
${scopeGuide}

### mode × ラウンドの補足
- R1 + structure → 選択肢の全体像を把握する問い
- R1 + release → 一番感情が強い部分を特定する問い
- R3 + release → 行動提案ではなく、感情の対象・時間・距離感を静かに絞る
- R3 + depth → 持ち帰りの問いで収束（行動ステップ不要）
上記以外はmode別ルールとラウンド戦略の組み合わせで自然に導出すること。

## Few-shot例（mode別 — 正例2つ + NG例1つ）

### structure
正例1: Echo:「転職先AとBで迷っている」→ Sense:「Aは安定だけど成長が止まる、Bは挑戦だけどリスクがある、というトレードオフがあるように聞こえます」→ Next:「3年後の自分を想像した時、どちらが後悔しにくいですか？」
正例2: Echo:「納期とクオリティの両方を求められている」→ Sense:「時間を取ればクオリティは上がるが、納期を守らないと信頼に影響する、という制約があるように見えます」→ Next:「納期とクオリティ、今回はどちらを先に固めたいですか？」
NG: Echo:「つらいですね」→ 感情受容だけで比較軸が返っていない

### release
正例1: Echo:「もう本当にムカつく、って感じなんですね」→ Sense:「それだけ何度も繰り返されてきたように聞こえます」→ Next:「もしよければ、一番ムカついた瞬間を教えてもらえますか？」
正例2: Echo:「モヤモヤが止まらない、という感じなんですね」→ Sense:「いくつかのことが重なって、どこから手をつければいいか見えなくなっているように聞こえます」→ Next:「そのモヤモヤは、誰に対して一番強いですか？」
NG: Sense:「つまり、問題は上司とのコミュニケーション構造ですね」→ 早すぎる構造化。吐き出しの途中で整理しない

### depth
正例1: Echo:「『いつもこうなる』と感じているんですね」→ Sense:「頼まれると断れない、というパターンが繰り返されているように聞こえます」→ Next:「『いつも』の中で、一度だけ違った結果になったことはありますか？」
正例2: Echo:「『結局自分が悪い』にたどり着く、と」→ Sense:「何が起きても自分に原因を探す、という前提が動いているのかもしれません」→ Next:「その『自分が悪い』は、いつ頃から自分の中にありますか？」
NG: Next:「明日、上司に相談してみますか？」→ 具体行動に落としすぎ。パターン・前提への問いが必要

### 共通NG
「それについてどう思いますか？」（広すぎ・mode不問・深まらない）

### Maybe
発火例（R3 + Depth 2 + release、R1-R2で「上司との関係」が継続、core_tension非null）:
Echo:「『また同じことの繰り返し』なんですね」
Sense:「何度も同じ壁にぶつかっている感覚があるように聞こえます」
Maybe:「もしかすると、認められたい気持ちと自分のやり方を通したい気持ちの両方があるのかもしれません」
Next:「その繰り返しの中で、一度だけ違った結果になったことはありますか？」

非発火例（R3だがDepth 1のまま）:
maybe: null（Depth 1 → 発火禁止）

NG: Maybe:「上司が嫌いなんですか？」→ 疑問文禁止
NG: Maybe:「もしかすると、承認欲求があります」→ 断定形禁止。「〜かもしれません」で終えること

## memoryの制約
- working_hypothesis: 60文字以内、なければnull
- open_loops: 最大3件、各40文字以内
- core_tension: 60文字以内、なければnull
- recent_question_angle: "priority" / "emotion" / "blindspot" / "constraint" / "tradeoff" / "action"

${context}
${guardrailConstraint}
${rerollConstraint || ''}
## 生成手順
1. modeを決定する（上記Step 1）
2. mode別ルール（上記Step 2）に従ってecho/sense/nextを生成する
3. 生成後、mode別の「禁止」に違反していないか確認し、違反があれば修正する
4. R3かつDepth 2以上なら、Maybe発火条件を確認し、条件を満たしフォーマットを守れる場合のみ生成する。迷ったらnull

## 出力形式（JSONのみ）
{
  "echo": "ユーザーの原文語彙を使った理解の映し返し",
  "sense": "仮説形でパターンや接続を浮かび上がらせる",
  "next": "二択 or 一点絞り込み型の問い",
  "maybe": null,
  "depth_level": 1,
  "mode": {
    "primary": "structure" | "release" | "depth",
    "secondary": "structure" | "release" | "depth" | null
  },
  "is_crisis": false,
  "memory": {
    "working_hypothesis": "...",
    "open_loops": ["..."],
    "core_tension": "...",
    "recent_question_angle": "...",
    "current_depth": 1
  }
}

JSONのみを出力してください。説明不要。`;
}

// --- Phase 6: Depth Control ---

/**
 * clampDepth — 上昇制御のみの安全弁。
 *
 * 責務: 過剰な depth escalation を止める。
 * - R1 は常に 1
 * - guardrail 発動中は常に 1
 * - 2段階ジャンプ禁止（1→3 は不可、1→2→3 は可）
 *
 * 責務外: 深度の低下（2→1, 3→1, 3→2）は制御しない。
 * 不安定時のキルスイッチ: 全行を `return 1;` に変えるだけで全セッション Depth 1 に戻せる。
 */
export function clampDepth(
  rawDepth: number,
  roundNumber: number,
  previousDepth: number | undefined,
  guardrailMode: GuardrailMode,
): 1 | 2 | 3 {
  if (roundNumber === 1) return 1;
  if (guardrailMode !== 'standard') return 1;
  const depth = Math.max(1, Math.min(3, rawDepth)) as 1 | 2 | 3;
  const prev = previousDepth || 1;
  if (depth > prev + 1) return (prev + 1) as 1 | 2 | 3;
  return depth;
}

// --- Phase 7: Maybe (仮説スロット) ---

const HEDGE_PATTERNS = [
  /かもしれません$/,
  /のかもしれません$/,
  /のかも$/,
  /かもしれない$/,
  /のかもしれない$/,
  /ような気がします$/,
  /ように思えます$/,
  /可能性があります$/,
  /のではないでしょうか$/,
];

const MAYBE_PREFIXES = ['もしかすると', 'もしかしたら', 'ひょっとすると', 'ひょっとしたら'];

export function sanitizeMaybe(raw: string | null): string | null {
  if (!raw) return null;
  let text = raw.trim().replace(/\s+/g, ' ').replace(/[。．]+$/, '');
  if (text.length === 0) return null;

  // 2文以上なら reject
  const sentences = text.split(/[。．.!！？?]/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) return null;

  // 疑問文・感嘆文なら reject
  if (/[？?！!]$/.test(text)) return null;

  // ヘッジ表現必須
  if (!HEDGE_PATTERNS.some(p => p.test(text))) return null;

  // 60文字超えは reject
  if (text.length > 60) return null;

  // prefix チェック
  if (!MAYBE_PREFIXES.some(p => text.startsWith(p))) return null;

  return text;
}

/**
 * clampMaybe — Maybe 発火の安全弁。
 *
 * 初版の保守的 gate:
 * - R3 only
 * - 今回 depth >= 2
 * - 前ラウンド depth >= 2
 * - memory に文脈蓄積あり（working_hypothesis or core_tension が非null）
 * - 連続発火禁止
 * - guardrail standard のみ
 *
 * キルスイッチ: 全行を `return null;` で Phase 7 無効化。
 */
export function clampMaybe(
  rawMaybe: string | null,
  depthLevel: 1 | 2 | 3,
  roundNumber: number,
  previousDepth: number | undefined,
  previousHadMaybe: boolean,
  guardrailMode: GuardrailMode,
  memory: SessionMemory | null,
): string | null {
  if (!rawMaybe) return null;
  if (roundNumber !== 3) return null;
  if (depthLevel < 2) return null;
  if ((previousDepth ?? 1) < 2) return null;
  if (previousHadMaybe) return null;
  if (guardrailMode !== 'standard') return null;
  if (!memory?.working_hypothesis && !memory?.core_tension) return null;
  return rawMaybe;
}

// --- Parser ---

const VALID_ANGLES = ['priority', 'emotion', 'blindspot', 'constraint', 'tradeoff', 'action'];
const VALID_MODES: ModeHint[] = ['structure', 'release', 'depth'];

export function parseTurnResponseV2(rawText: string): TurnResponseV2 | null {
  let text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.echo || !parsed.sense || !parsed.next) return null;

    // Phase 6: depth_level パース
    const rawDepth = parsed.depth_level;
    const depthLevel: 1 | 2 | 3 = (rawDepth === 1 || rawDepth === 2 || rawDepth === 3) ? rawDepth : 1;

    // Phase 7: maybe パース（sanitize のみ、clamp は round.ts で）
    const rawMaybe = typeof parsed.maybe === 'string' ? parsed.maybe : null;

    // memory構築 — previous_had_maybe はLLMからparseしない（サーバー側で決定）
    const memory: SessionMemory = {
      working_hypothesis:
        typeof parsed.memory?.working_hypothesis === 'string' && parsed.memory.working_hypothesis
          ? parsed.memory.working_hypothesis.slice(0, 60)
          : null,
      open_loops: Array.isArray(parsed.memory?.open_loops)
        ? parsed.memory.open_loops
            .slice(0, 3)
            .map((s: unknown) => String(s).slice(0, 40))
            .filter((s: string) => s.length > 0)
        : [],
      core_tension:
        typeof parsed.memory?.core_tension === 'string' && parsed.memory.core_tension
          ? parsed.memory.core_tension.slice(0, 60)
          : null,
      recent_question_angle: VALID_ANGLES.includes(parsed.memory?.recent_question_angle)
        ? parsed.memory.recent_question_angle
        : 'blindspot',
      current_depth: depthLevel,
      // previous_had_maybe は意図的に省略（サーバー側で決定）
    };

    const primaryMode = VALID_MODES.includes(parsed.mode?.primary)
      ? parsed.mode.primary
      : 'structure';
    const secondaryMode = parsed.mode?.secondary && VALID_MODES.includes(parsed.mode.secondary)
      ? parsed.mode.secondary
      : undefined;

    return {
      echo: String(parsed.echo),
      sense: String(parsed.sense),
      next: String(parsed.next),
      maybe: sanitizeMaybe(rawMaybe),
      mode: { primary: primaryMode, secondary: secondaryMode },
      memory,
      is_crisis: parsed.is_crisis === true,
      depth_level: depthLevel,
    };
  } catch {
    return null;
  }
}

// --- Fallback (Echo must never break) ---

/**
 * Fallback は安全な最低保証。無害性優先。
 * 通常応答より賢く見せようとしない。
 * 解釈ではなく、続けやすい余白を返す。
 */
export function generateFallbackEchoSenseNext(
  transcript: string,
  roundNumber: number,
  existingMemory: SessionMemory | null = null,
): TurnResponseV2 {
  const baseMemory: SessionMemory = existingMemory
    ? { ...existingMemory }
    : {
        working_hypothesis: null,
        open_loops: [],
        core_tension: null,
        recent_question_angle: 'blindspot',
      };

  const sentences = transcript
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && !/^(えーと|あの|まあ|うーん|そうですね)+$/.test(s));

  const isShortTranscript = transcript.length < 15;
  const lastPhrase = sentences[sentences.length - 1] || '';

  if (isShortTranscript) {
    return {
      echo: '考えがまとまりかけているようですね。',
      sense: '言葉にしようとしている途中のように聞こえます。',
      next: roundNumber <= 2
        ? '今一番頭に浮かんでいるのは、人のことですか、それとも自分自身のことですか？'
        : '今の気持ちを一言で表すなら、「焦り」と「迷い」のどちらが近いですか？',
      maybe: null,
      mode: { primary: 'release' },
      memory: { ...baseMemory, recent_question_angle: 'emotion', current_depth: 1 },
      is_crisis: false,
      depth_level: 1 as const,
    };
  }

  if (lastPhrase.length >= 10) {
    const keyword = lastPhrase.slice(0, 30);
    return {
      echo: `「${keyword}」が気になっているんですね。`,
      sense: `「${keyword}」のあたりが、特に気になっているように聞こえます。`,
      next: roundNumber === 1
        ? `「${keyword}」について、以前からずっと感じていたことですか、それとも最近急に気になり始めたことですか？`
        : roundNumber === 2
          ? `「${keyword}」の中で、いちばん気がかりなのは何ですか？`
          : `「${keyword}」に対して、今日中にできる最小の一歩は何ですか？`,
      maybe: null,
      mode: { primary: 'structure' },
      memory: {
        ...baseMemory,
        recent_question_angle: roundNumber === 1 ? 'emotion' : roundNumber === 2 ? 'constraint' : 'action',
        current_depth: 1,
      },
      is_crisis: false,
      depth_level: 1 as const,
    };
  }

  return {
    echo: '話の内容を受け止めています。',
    sense: 'いくつかのことが同時に動いているように聞こえます。',
    next: roundNumber <= 2
      ? '今いちばん先に言葉にしたいのは、どの部分ですか？'
      : '今すぐ誰かに相談するとしたら、何について聞きますか？',
    maybe: null,
    mode: { primary: 'structure' },
    memory: { ...baseMemory, recent_question_angle: 'priority', current_depth: 1 },
    is_crisis: false,
    depth_level: 1 as const,
  };
}

// --- Summary V2: normalizeQuote ---

export function normalizeQuote(raw: string): string {
  let q = raw.trim();
  // 改行連打の圧縮
  q = q.replace(/\n{2,}/g, '\n');
  // 空防止
  if (!q) return '';
  // 60文字超過時は文節末尾で自然に切る
  if (q.length > 60) {
    const cutPoints = ['。', '」', '、'];
    let bestCut = -1;
    for (const cp of cutPoints) {
      const idx = q.lastIndexOf(cp, 60);
      if (idx > bestCut) bestCut = idx;
    }
    if (bestCut > 10) {
      q = q.slice(0, bestCut + 1);
    } else {
      q = q.slice(0, 60);
    }
  }
  return q;
}

// --- Summary V2: extractive helpers ---

function extractFirstMeaningfulSentence(transcript: string | undefined | null): string {
  if (!transcript) return 'ここから始まりました';
  const sentences = transcript
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && !/^(えーと|あの|まあ|うーん|そうですね)+$/.test(s));
  const found = sentences[0];
  if (!found) return 'ここから始まりました';
  return normalizeQuote(found);
}

function extractLastMeaningfulSentence(transcript: string | undefined | null): string {
  if (!transcript) return 'ここまで話しました';
  const sentences = transcript
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && !/^(えーと|あの|まあ|うーん|そうですね)+$/.test(s));
  const found = sentences[sentences.length - 1];
  if (!found) return 'ここまで話しました';
  return normalizeQuote(found);
}

// --- Summary V2: Extractive Fallback ---

export function buildExtractiveFallback(rounds: RoundData[]): SummaryResponseV2 {
  const firstMeaningful = extractFirstMeaningfulSentence(rounds[0]?.transcript);
  const lastMeaningful = extractLastMeaningfulSentence(rounds[rounds.length - 1]?.transcript);

  return {
    version: 2,
    journey: {
      start_quote: firstMeaningful,
      shift: rounds.length >= 2
        ? '話しながら、少しずつ焦点が移っていきました'
        : '考え始めたところです',
      end_quote: rounds.length >= 2 ? lastMeaningful : firstMeaningful,
    },
    awareness: '今日話した内容が、頭の中に残っています',
    next_step: { type: 'question', content: '今日話したことの中で、一番引っかかった部分を紙に書き出してみてください' },
  };
}

// --- Summary V2: Prompt Builder ---

export function buildSummaryPromptV2(rounds: RoundData[], memory: SessionMemory | null): string {
  let input = '';

  for (const r of rounds) {
    input += `\n## ラウンド ${r.round_number}\n`;
    input += `### ユーザー発話（transcript）:\n${r.transcript.slice(-1000)}\n`;
    if (r.echo) input += `### echo: ${r.echo}\n`;
    if (r.sense) input += `### sense: ${r.sense}\n`;
    if (r.next) input += `### next: ${r.next}\n`;
  }

  if (memory) {
    input += `\n## セッションメモリ（参考情報のみ、引用・言い換え禁止）:\n`;
    if (memory.working_hypothesis) input += `- working_hypothesis: ${memory.working_hypothesis}\n`;
    if (memory.open_loops?.length > 0) input += `- open_loops: ${memory.open_loops.join('、')}\n`;
    if (memory.core_tension) input += `- core_tension: ${memory.core_tension}\n`;
  }

  const roundCount = rounds.length;

  return `あなたはユーザーの思考セッション（${roundCount}ラウンド）のまとめを作成します。

## 核心原則
ユーザーが「これは自分で気づいたことだ」と感じられるまとめを作ること。
AIの分析・診断・ラベル付けは一切禁止。ユーザーの原文から引用し、ユーザー視点で書く。

## 入力データ
${input}

## 出力構造

### journey
- **start_quote**: セッション前半で最もテーマを表すユーザーの原文。20〜60文字目安。文節の途中で切らない。echo/sense/memoryからの引用禁止。transcriptからのみ。
- **shift**: 思考変化を1文で（ユーザー視点、AI分析禁止）。${roundCount === 1 ? '1ラウンドのみなので「〜について考え始めたところです」' : ''}
- **end_quote**: セッション後半で最も変化を表すユーザーの原文。20〜60文字目安。文節の途中で切らない。echo/sense/memoryからの引用禁止。transcriptからのみ。${roundCount === 1 ? '1ラウンドの場合はstart_quoteと同じ発話からでもよい。' : ''}

### awareness
最も重要な気づき。1文のみ。仮説形（「〜かもしれない」「〜のように感じている」）。断定禁止。
ユーザーの原文に近い語彙を優先する。
禁止: 「あなたは本当は〜」「つまり〜だった」。ユーザーが発言していない感情の付与禁止。原因分析・診断・ラベル付け禁止。

### next_step
- **type**: 以下のいずれか
  - "action": 実務・意思決定・整理が進んでいる時（具体的な行動）
  - "question": まだ核心が曖昧な時（紙やメモに書ける一問）
  - "invitation": 感情負荷が高い・深掘りを急がない時（実行可能な軽い招待）
- **content**: 1文のみ。
  - action: 10分以内に着手できる具体行動
  - question: 紙やメモに書ける一問
  - invitation: 実行可能な軽い招待
  - 「整理する」「考える」「向き合う」単独は禁止（具体的な対象・手段を伴うこと）

## echo/sense/memoryの使用制約
- echo/senseはセッションの流れを把握するための補助材料。awarenessやjourney.shiftをecho/senseの言い換えで構成することは禁止。
- memoryはセッションの整合性確認用のみ。memoryの言い換えでawareness/shift/next_stepを作ることは禁止。
- **主材料はtranscriptのみ**。quote抽出・awareness・shift・next_stepすべてtranscriptから作る。

## 出力形式（JSONのみ）
{
  "version": 2,
  "journey": {
    "start_quote": "セッション前半のユーザー原文",
    "shift": "思考変化を1文で",
    "end_quote": "セッション後半のユーザー原文"
  },
  "awareness": "最も重要な気づき（仮説形、1文）",
  "next_step": {
    "type": "action" | "question" | "invitation",
    "content": "次の一歩"
  }
}

JSONのみを出力してください。説明不要。`;
}

// --- Summary V2: Parser ---

const VALID_NEXT_STEP_TYPES = ['action', 'question', 'invitation'] as const;

export function parseSummaryResponseV2(rawText: string): SummaryResponseV2 | null {
  let text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // 必須項目チェック
    if (!parsed.journey?.start_quote || !parsed.journey?.shift || !parsed.journey?.end_quote) return null;
    if (!parsed.awareness) return null;
    if (!parsed.next_step?.type || !parsed.next_step?.content) return null;

    // type enum チェック
    if (!VALID_NEXT_STEP_TYPES.includes(parsed.next_step.type)) return null;

    const startQuote = String(parsed.journey.start_quote);
    const shift = String(parsed.journey.shift);
    const endQuote = String(parsed.journey.end_quote);
    const awareness = String(parsed.awareness);
    const content = String(parsed.next_step.content);

    // 最低文字数チェック
    if (startQuote.length < 5 || endQuote.length < 5 || shift.length < 5 || awareness.length < 5 || content.length < 5) {
      return null;
    }

    return {
      version: 2,
      journey: {
        start_quote: startQuote,
        shift,
        end_quote: endQuote,
      },
      awareness,
      next_step: {
        type: parsed.next_step.type as 'action' | 'question' | 'invitation',
        content,
      },
    };
  } catch {
    return null;
  }
}
