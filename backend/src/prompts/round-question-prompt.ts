export type QuestionAngle = 'priority' | 'emotion' | 'blindspot' | 'constraint' | 'tradeoff' | 'action';

const VALID_ANGLES: QuestionAngle[] = ['priority', 'emotion', 'blindspot', 'constraint', 'tradeoff', 'action'];

export interface SessionMemory {
  working_hypothesis: string | null;
  open_loops: string[];
  core_tension: string | null;
  recent_question_angle: QuestionAngle;
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

// Step 2
export function buildContext(
  transcript: string,
  memory: SessionMemory | null,
  roundNumber: number,
  previousQuestions: string[],
): string {
  const processed = preprocessTranscript(transcript);
  let ctx = `## ラウンド: ${roundNumber} / 3\n\n`;

  if (previousQuestions.length > 0) {
    ctx += `## 前のラウンドの質問:\n`;
    ctx += previousQuestions.map((q, i) => `- R${i + 1}: ${q}`).join('\n');
    ctx += '\n\n';
  }

  if (memory) {
    ctx += `## 現在のメモリ:\n`;
    if (memory.working_hypothesis) ctx += `- working_hypothesis: ${memory.working_hypothesis}\n`;
    if (memory.open_loops.length > 0) ctx += `- open_loops: ${memory.open_loops.join('、')}\n`;
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

// Fallback (context-connected)
export function generateFallbackResponse(transcript: string, roundNumber: number): RoundResponse {
  const sentences = transcript.split(/[。！？\n]/).filter((s) => s.trim().length > 5);
  const last = sentences[sentences.length - 1]?.trim() || '';

  if (last.length > 10) {
    return {
      mirror: `「${last.slice(0, 30)}」が気になりました`,
      question:
        roundNumber <= 2
          ? 'それは結果が怖いのですか？それとも選べないこと自体が問題ですか？'
          : 'その中で、一番最初に手をつけるべきことは何ですか？',
      memory: {
        working_hypothesis: null,
        open_loops: [],
        core_tension: null,
        recent_question_angle: 'blindspot',
      },
    };
  }

  return {
    mirror: '話の内容を整理しています',
    question: '一番引っかかっていることと、その理由を教えてください',
    memory: {
      working_hypothesis: null,
      open_loops: [],
      core_tension: null,
      recent_question_angle: 'blindspot',
    },
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
    if (memory.open_loops.length > 0) input += `- open_loops: ${memory.open_loops.join('、')}\n`;
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
