/**
 * Thinking Companion Prompt — Phase 2
 * Echo/Sense/Next response format with safety guardrails + sensitive topic detection
 */

import { SessionMemory, QuestionRating, preprocessTranscript } from './round-question-prompt';
import { CRISIS_RESOURCES, CRISIS_FALLBACK_TEXT } from '../config/crisis-resources';

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
  mode: ModePair;         // TODO(Phase2): Remove temporary mode observability after Phase 2 evaluation
  memory: SessionMemory;
  is_crisis: boolean;
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
    mode: { primary: 'release' },
    memory: {
      working_hypothesis: null,
      open_loops: [],
      core_tension: null,
      recent_question_angle: 'emotion',
    },
    is_crisis: true,
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
分析・構造化・リフレーミング禁止\n`;

    case 'soft_empathy':
      return `\n## 応答制約: soft_empathy（${topicLabel}）
Echo: 感情や状況を短く受け止める / Sense: 仮説1つまで、因果説明しない / Next: 選択肢型、助言禁止・原因分析禁止・整理しすぎた説明禁止\n`;

    case 'soft_reorient':
      return `\n## 応答制約: soft_reorient
深掘り禁止 / 対象・時間軸・抽象度のどれかを必ず変える / 同じ論点の言い換え再質問禁止 / Nextは一問だけ、説明を足さない\n`;

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
    ctx += `- recent_question_angle: ${memory.recent_question_angle}\n\n`;
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
      ? `**探索**: 最も感情が乗っている部分 or 最も曖昧な部分を特定する。
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

## mode（方向感）
ユーザーの発話から primary（主傾向）と secondary（副傾向、あればのみ）を判断する:
- **structure**: 選択肢の整理、意思決定、ロジスティクスが中心
- **release**: 感情の吐き出し、ストレス、愚痴、モヤモヤ
- **depth**: 自己理解、パターン、前提への問い

primaryが応答方針を決める:
- structure → Echoは論点を構造的に返す、Senseは決定空間を整理、Nextは制約・優先順位の問い
- release → Echoは感情ごと受け止める、Senseは吐き出したものを俯瞰、Nextは柔らかい招待
- depth → Echoは言葉の裏の前提を映す、Senseは前提・パターンを仮説提示、Nextは持ち帰る問い

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

## Few-shot例
良い例1: 「それは『やりたくない』と『やれない』のどちらに近いですか？」
良い例2: 「一番引っかかっているのは、相手のことですか、それとも自分自身のことですか？」
良い例3: 「その中で、今いちばん言葉にしやすいのはどの部分ですか？」
悪い例: 「それについてどう思いますか？」（広すぎ・深まらない）

## memoryの制約
- working_hypothesis: 60文字以内、なければnull
- open_loops: 最大3件、各40文字以内
- core_tension: 60文字以内、なければnull
- recent_question_angle: "priority" / "emotion" / "blindspot" / "constraint" / "tradeoff" / "action"

${context}
${guardrailConstraint}
${rerollConstraint || ''}
## 出力形式（JSONのみ）
{
  "echo": "ユーザーの原文語彙を使った理解の映し返し",
  "sense": "仮説形でパターンや接続を浮かび上がらせる",
  "next": "二択 or 一点絞り込み型の問い",
  "mode": {
    "primary": "structure" | "release" | "depth",
    "secondary": "structure" | "release" | "depth" | null
  },
  "is_crisis": false,
  "memory": {
    "working_hypothesis": "...",
    "open_loops": ["..."],
    "core_tension": "...",
    "recent_question_angle": "..."
  }
}

JSONのみを出力してください。説明不要。`;
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
    };

    // TODO(Phase2): Remove temporary mode observability after Phase 2 evaluation
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
      mode: { primary: primaryMode, secondary: secondaryMode },
      memory,
      is_crisis: parsed.is_crisis === true,
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
      mode: { primary: 'release' },
      memory: { ...baseMemory, recent_question_angle: 'emotion' },
      is_crisis: false,
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
      mode: { primary: 'structure' },
      memory: {
        ...baseMemory,
        recent_question_angle: roundNumber === 1 ? 'emotion' : roundNumber === 2 ? 'constraint' : 'action',
      },
      is_crisis: false,
    };
  }

  return {
    echo: '話の内容を受け止めています。',
    sense: 'いくつかのことが同時に動いているように聞こえます。',
    next: roundNumber <= 2
      ? '今いちばん先に言葉にしたいのは、どの部分ですか？'
      : '今すぐ誰かに相談するとしたら、何について聞きますか？',
    mode: { primary: 'structure' },
    memory: { ...baseMemory, recent_question_angle: 'priority' },
    is_crisis: false,
  };
}
