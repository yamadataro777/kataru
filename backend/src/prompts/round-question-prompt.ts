export type QuestionAngle = 'priority' | 'emotion' | 'blindspot' | 'constraint' | 'tradeoff' | 'action';

const VALID_ANGLES: QuestionAngle[] = ['priority', 'emotion', 'blindspot', 'constraint', 'tradeoff', 'action'];

export interface SessionMemory {
  working_hypothesis: string | null;
  open_loops: string[];
  core_tension: string | null;
  recent_question_angle: QuestionAngle;
  current_depth?: 1 | 2 | 3;  // Phase 6
  previous_had_maybe?: boolean;  // Phase 7: サーバー側で決定、LLM出力からparseしない
}

export interface RoundResponse {
  mirror: string;
  question: string;
  memory: SessionMemory;
}

export interface SummaryResponse {
  blockage: string;
  key_points: string[];
  next_step: string;
}

// Step 1
export function preprocessTranscript(transcript: string): string {
  return transcript.slice(-1000);
}

export type QuestionRating = 'forward' | 'neutral' | 'off';

// Step 2
export function buildContext(
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

    // Rating interpretation guidance
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

// Step 3
export function buildRoundQuestionPrompt(context: string, roundNumber: number): string {
  const scopeGuide =
    roundNumber === 1
      ? '広めの問い（全体像を捉える、何が一番気になるか）'
      : roundNumber === 2
        ? '中程度の問い（論点を絞る、具体的な障壁や選択肢に触れる）'
        : '狭く収束する問い（核心に迫る、具体的な次のアクションに向かう）';

  return `あなたは思考整理の専門家です。ユーザーが声で考えを話しています。

## あなたの役割
1. 理解ミラー（1行）: ユーザーの話の中心的な詰まりや要点を簡潔に映し返す
2. 質問（1つ）: 思考を次に進める問い
3. メモリ更新: セッションの文脈を半構造化データで追跡

## 質問の規範
- 広すぎる質問禁止（「それについてどう思いますか？」「なぜそう思いますか？」等）
- yes/no禁止
- 1問のみ
- 直前の話題に接続すること
- 同じangleの連続禁止
- このラウンドの質問幅: ${scopeGuide}

## memoryの制約
- working_hypothesis: 60文字以内、なければnull
- open_loops: 最大3件、各40文字以内
- core_tension: 60文字以内、なければnull
- recent_question_angle: 以下のいずれか1つ
  "priority" / "emotion" / "blindspot" / "constraint" / "tradeoff" / "action"

${context}

## 出力形式（JSONのみ）
{
  "mirror": "〇〇が中心的な詰まりに見えます",
  "question": "具体的で文脈に接続した問い？",
  "memory": {
    "working_hypothesis": "...",
    "open_loops": ["..."],
    "core_tension": "...",
    "recent_question_angle": "..."
  }
}

JSONのみを出力してください。説明不要。`;
}

// Step 3-V2
export function buildRoundQuestionPromptV2(context: string, roundNumber: number): string {
  const scopeGuide =
    roundNumber === 1
      ? `**探索**: 最も感情が乗っている部分 or 最も曖昧な部分を特定する。
テクニック: 対比（AとBどちらが近い？）、具体化（例えば？）、時間軸（いつから？）`
      : roundNumber === 2
        ? `**深掘り**: 構造的な障壁・矛盾・トレードオフに焦点を当てる。
テクニック: 仮定の排除（もしXがなかったら？）、他者視点（相手はどう見ている？）、本音確認（本当はどうしたい？）`
        : `**収束**: 動けるようになる問いを投げる。
テクニック: 最小ステップ（今日中にできる一歩は？）、判断基準（何が決まれば動ける？）、コミット（誰に宣言する？）`;

  return `あなたは思考整理の専門家です。ユーザーが声で考えを話しています。

## あなたの役割
1. 理解ミラー（1行）: ユーザーの話の中心的な詰まりや要点を簡潔に映し返す
2. 質問（1つ）: 思考を次に進める問い
3. メモリ更新: セッションの文脈を半構造化データで追跡

## 質問の規範
- 広すぎる質問禁止（「それについてどう思いますか？」「なぜそう思いますか？」等）
- 「なぜ」単独禁止、「どう思う」単独禁止
- yes/no禁止
- 1問のみ
- 直前の話題に接続すること
- 同じangleの連続禁止
- 既に答えた内容への再質問禁止
- 抽象度が変わらない言い換え禁止
- 質問形は**二択 or 一点絞り込み型**を優先

## このラウンドの質問戦略
${scopeGuide}

## Few-shot例
良い: 「チームへの迷惑と、あなた自身のキャリアの停滞、どちらがより痛みとして大きいですか？」
悪い: 「転職についてどう思いますか？」（広すぎ・既に話している）

## memoryの制約
- working_hypothesis: 60文字以内、なければnull
- open_loops: 最大3件、各40文字以内
- core_tension: 60文字以内、なければnull
- recent_question_angle: 以下のいずれか1つ
  "priority" / "emotion" / "blindspot" / "constraint" / "tradeoff" / "action"

${context}

## 出力形式（JSONのみ）
{
  "mirror": "〇〇が中心的な詰まりに見えます",
  "question": "具体的で文脈に接続した問い？",
  "memory": {
    "working_hypothesis": "...",
    "open_loops": ["..."],
    "core_tension": "...",
    "recent_question_angle": "..."
  }
}

JSONのみを出力してください。説明不要。`;
}

// Step 4
export function parseRoundResponse(rawText: string): RoundResponse | null {
  let text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.mirror || !parsed.question || !parsed.memory) return null;

    const memory: SessionMemory = {
      working_hypothesis:
        typeof parsed.memory.working_hypothesis === 'string' && parsed.memory.working_hypothesis
          ? parsed.memory.working_hypothesis.slice(0, 60)
          : null,
      open_loops: Array.isArray(parsed.memory.open_loops)
        ? parsed.memory.open_loops
            .slice(0, 3)
            .map((s: unknown) => String(s).slice(0, 40))
            .filter((s: string) => s.length > 0)
        : [],
      core_tension:
        typeof parsed.memory.core_tension === 'string' && parsed.memory.core_tension
          ? parsed.memory.core_tension.slice(0, 60)
          : null,
      recent_question_angle: VALID_ANGLES.includes(parsed.memory.recent_question_angle)
        ? parsed.memory.recent_question_angle
        : 'blindspot',
    };

    return {
      mirror: String(parsed.mirror),
      question: String(parsed.question),
      memory,
    };
  } catch {
    return null;
  }
}

// Fallback (context-connected, preserves existing memory)
export function generateFallbackResponse(
  transcript: string,
  roundNumber: number,
  existingMemory: SessionMemory | null = null,
): RoundResponse {
  const baseMemory: SessionMemory = existingMemory
    ? { ...existingMemory }
    : {
        working_hypothesis: null,
        open_loops: [],
        core_tension: null,
        recent_question_angle: 'blindspot',
      };

  // Extract meaningful sentences (filter fillers and very short fragments)
  const sentences = transcript
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && !/^(えーと|あの|まあ|うーん|そうですね)+$/.test(s));

  const isShortTranscript = transcript.length < 15;

  if (isShortTranscript) {
    // Short transcript: safe narrowing question
    return {
      mirror: '考えがまとまりかけているようですね',
      question:
        roundNumber <= 2
          ? '今一番頭に浮かんでいるのは、人のことですか、それとも自分自身のことですか？'
          : '今の気持ちを一言で表すなら、「焦り」と「迷い」のどちらが近いですか？',
      memory: { ...baseMemory, recent_question_angle: 'emotion' },
    };
  }

  const last = sentences[sentences.length - 1] || '';

  if (last.length >= 10) {
    // Extract keyword from last sentence for connection
    const keyword = last.slice(0, 30);
    const question =
      roundNumber === 1
        ? `「${keyword}」について、それは以前からずっと感じていたことですか、それとも最近急に気になり始めたことですか？`
        : roundNumber === 2
          ? `「${keyword}」の裏にある、一番避けたいシナリオは何ですか？`
          : `「${keyword}」に対して、今日中にできる最小の一歩は何ですか？`;

    return {
      mirror: `「${keyword}」が気になりました`,
      question,
      memory: {
        ...baseMemory,
        recent_question_angle: roundNumber === 1 ? 'emotion' : roundNumber === 2 ? 'constraint' : 'action',
      },
    };
  }

  // Generic but still binary/narrowing
  return {
    mirror: '話の内容を整理しています',
    question:
      roundNumber <= 2
        ? '今の状況で一番エネルギーを使っているのは、「決めること」と「動くこと」のどちらですか？'
        : '今すぐ誰かに相談するとしたら、何について聞きますか？',
    memory: { ...baseMemory, recent_question_angle: 'priority' },
  };
}

// Summary prompt (lightweight input)
export function buildSummaryPrompt(
  mirrors: string[],
  questions: string[],
  memory: SessionMemory | null,
  round3Transcript: string,
): string {
  let input = '';
  for (let i = 0; i < 3; i++) {
    input += `Round ${i + 1} mirror: ${mirrors[i] || '(なし)'}\n`;
    input += `Round ${i + 1} question: ${questions[i] || '(なし)'}\n`;
  }

  if (memory) {
    input += `\n最終メモリ:\n`;
    if (memory.working_hypothesis) input += `- working_hypothesis: ${memory.working_hypothesis}\n`;
    if (memory.open_loops?.length > 0) input += `- open_loops: ${memory.open_loops.join('、')}\n`;
    if (memory.core_tension) input += `- core_tension: ${memory.core_tension}\n`;
  }

  input += `\nRound 3 transcript:\n${round3Transcript.slice(-1500)}`;

  return `あなたは思考整理の専門家です。ユーザーが3ラウンドの思考セッションを完了しました。
以下の情報から、セッションの要約を生成してください。

## 入力
${input}

## 出力形式（JSONのみ）
{
  "blockage": "今回の詰まり（1行、具体的に）",
  "key_points": ["重要論点1", "重要論点2", "重要論点3"],
  "next_step": "次の一歩（具体的、10分以内で実行可能なアクション）"
}

## 制約
- blockageは1行で、ユーザーの言葉を引用すること
- key_pointsは2-3個、各20文字以内
- next_stepは1つ、具体的な行動（「考える」「振り返る」等の曖昧なものは禁止）

JSONのみを出力してください。説明不要。`;
}

export function parseSummaryResponse(rawText: string): SummaryResponse | null {
  const text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.blockage || !Array.isArray(parsed.key_points) || !parsed.next_step) return null;

    return {
      blockage: String(parsed.blockage),
      key_points: parsed.key_points.map((s: unknown) => String(s)).slice(0, 3),
      next_step: String(parsed.next_step),
    };
  } catch {
    return null;
  }
}
