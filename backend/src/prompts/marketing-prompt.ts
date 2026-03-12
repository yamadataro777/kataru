// === Types ===

export type QuestionType = 'gap_fill' | 'hypothesis_compress' | 'validation_design';
export type FieldStatus = 'known' | 'assumed' | 'missing' | 'conflicted';
export type MktQuestionRating = 'hit' | 'neutral' | 'off';

export interface MarketingField<T = string | string[] | null> {
  status: FieldStatus;
  value: T;
}

export interface MarketingCanvasState {
  goal: MarketingField<string | null>;
  product: MarketingField<string | null>;
  target_customer: MarketingField<string | null>;
  pain: MarketingField<string[]>;
  trigger_moment: MarketingField<string[]>;
  promise: MarketingField<string | null>;
  differentiation: MarketingField<string[]>;
  proof: MarketingField<string[]>;
  channel: MarketingField<string[]>;
  offer: MarketingField<string[]>;
  next_experiment: MarketingField<string | null>;
  current_focus?: string | null;
}

export interface MarketingRoundResponse {
  mirror: string;
  question: string;
  question_type: QuestionType;
  question_target_field: string;
  canvas_updates: Partial<MarketingCanvasState>;
}

export interface MarketingSummary {
  marketing_hypothesis: string;
  target_hypothesis: string;
  pain_hypothesis: string;
  promised_value: string;
  appeal_angles: string[];
  next_experiment: string;
}

// === Canvas helpers ===

const CANVAS_FIELDS = [
  'goal', 'product', 'target_customer', 'pain', 'trigger_moment',
  'promise', 'differentiation', 'proof', 'channel', 'offer', 'next_experiment',
] as const;

const STRING_FIELDS = new Set(['goal', 'product', 'target_customer', 'promise', 'next_experiment']);
const ARRAY_FIELDS = new Set(['pain', 'trigger_moment', 'differentiation', 'proof', 'channel', 'offer']);

const VALID_QUESTION_TYPES: QuestionType[] = ['gap_fill', 'hypothesis_compress', 'validation_design'];

// Stage-aware field priorities: each round focuses on specific fields
const STAGE_FIELDS: readonly string[][] = [
  ['product', 'target_customer', 'pain'],                    // R1: 基盤
  ['target_customer', 'pain', 'product', 'trigger_moment'],  // R2: 基盤深化
  ['pain', 'trigger_moment', 'promise', 'differentiation'],  // R3: 掘り下げ
  ['promise', 'differentiation', 'channel', 'proof'],        // R4: 絞り込み
  ['next_experiment', 'offer', 'channel', 'proof'],          // R5: 検証設計
];

export function createEmptyCanvas(goal?: string): MarketingCanvasState {
  return {
    goal: { status: goal ? 'known' : 'missing', value: goal || null },
    product: { status: 'missing', value: null },
    target_customer: { status: 'missing', value: null },
    pain: { status: 'missing', value: [] },
    trigger_moment: { status: 'missing', value: [] },
    promise: { status: 'missing', value: null },
    differentiation: { status: 'missing', value: [] },
    proof: { status: 'missing', value: [] },
    channel: { status: 'missing', value: [] },
    offer: { status: 'missing', value: [] },
    next_experiment: { status: 'missing', value: null },
    current_focus: null,
  };
}

export function formatCanvasForPrompt(canvas: MarketingCanvasState): string {
  let out = '## キャンバス状態:\n';
  for (const field of CANVAS_FIELDS) {
    const f = canvas[field] as MarketingField;
    const value = Array.isArray(f.value) ? f.value.join(', ') : (f.value || '(未設定)');
    out += `- ${field} [${f.status}]: ${value}\n`;
  }
  if (canvas.current_focus) {
    out += `- current_focus: ${canvas.current_focus}\n`;
  }
  return out;
}

// Compact canvas: only fields needing attention + filled fields as one-liners
export function formatCanvasCompact(canvas: MarketingCanvasState): string {
  const attention: string[] = [];
  const filled: string[] = [];

  for (const field of CANVAS_FIELDS) {
    const f = canvas[field] as MarketingField;
    const label = FIELD_LABELS[field] || field;
    const value = Array.isArray(f.value) ? f.value.join(', ') : (f.value || '');

    if (f.status === 'conflicted') {
      attention.push(`[矛盾] ${label}: ${value}`);
    } else if (f.status === 'missing') {
      attention.push(`[空] ${label}`);
    } else if (f.status === 'assumed' && Array.isArray(f.value) && f.value.length >= 3) {
      attention.push(`[候補多] ${label}: ${value}`);
    } else if (value) {
      filled.push(`${label}=${value}`);
    }
  }

  let out = '';
  if (filled.length > 0) out += `確定/仮説: ${filled.join(' / ')}\n`;
  if (attention.length > 0) out += `要注目:\n${attention.map(a => `- ${a}`).join('\n')}\n`;
  return out;
}

// Pre-compute suggested target field with stage-aware prioritization
export function suggestTargetField(
  canvas: MarketingCanvasState,
  prevTargetFields: string[] = [],
  roundNum: number = 1,
): { field: string; reason: string } {
  const recentTargets = new Set(prevTargetFields.slice(-2));
  const stageIdx = Math.min(Math.max(roundNum, 1), 5) - 1;
  const stageCandidates = STAGE_FIELDS[stageIdx];

  // Tier 1 (stage candidates) → Tier 2 (all fields)
  const searchSets = [stageCandidates, CANVAS_FIELDS];

  for (const fields of searchSets) {
    // Priority 1: conflicted (non-recent)
    for (const field of fields) {
      if (recentTargets.has(field)) continue;
      const f = canvas[field as keyof MarketingCanvasState] as MarketingField;
      if (f?.status === 'conflicted') return { field, reason: '矛盾あり' };
    }
    // Priority 2: array 3+ (non-recent)
    for (const field of fields) {
      if (recentTargets.has(field) || !ARRAY_FIELDS.has(field)) continue;
      const f = canvas[field as keyof MarketingCanvasState] as MarketingField<string[]>;
      if (Array.isArray(f.value) && f.value.length >= 3) return { field, reason: '候補過多' };
    }
    // Priority 3: missing (non-recent, skip goal)
    for (const field of fields) {
      if (recentTargets.has(field) || field === 'goal') continue;
      const f = canvas[field as keyof MarketingCanvasState] as MarketingField;
      if (f?.status === 'missing') return { field, reason: '欠損' };
    }
  }

  // Tier 3: desperate fallback — ignore recentTargets
  for (const field of CANVAS_FIELDS) {
    if (field === 'goal') continue;
    const f = canvas[field] as MarketingField;
    if (f.status === 'missing') return { field, reason: '欠損' };
  }

  return { field: 'next_experiment', reason: '検証設計' };
}

// === Context & Prompt ===

export interface MarketingContextResult {
  context: string;
  compactCanvasChars: number;
}

export function buildMarketingContext(
  transcript: string,
  canvas: MarketingCanvasState,
  roundNum: number,
  prevQuestions: string[],
  prevRatings?: (MktQuestionRating | null)[],
  suggestedField?: { field: string; reason: string },
): MarketingContextResult {
  const processed = transcript.slice(-1500);
  const compactCanvasStr = formatCanvasCompact(canvas);

  let ctx = `## ラウンド: ${roundNum} / 5\n\n`;

  ctx += compactCanvasStr;
  ctx += '\n';

  if (prevQuestions.length > 0) {
    ctx += `## 前のラウンド:\n`;
    ctx += prevQuestions
      .map((q, i) => {
        const rating = prevRatings?.[i];
        return rating
          ? `- R${i + 1}: ${q} → 評価: ${rating}`
          : `- R${i + 1}: ${q}`;
      })
      .join('\n');
    ctx += '\n\n';

    if (prevRatings?.some((r) => r != null)) {
      ctx += `## 評価の解釈:\n`;
      ctx += `- "hit" → 同系統で一段深く\n`;
      ctx += `- "neutral" → 角度を変える\n`;
      ctx += `- "off" → 同じフィールドを避ける\n\n`;
    }
  }

  ctx += `## ユーザー発言（最新1500文字）:\n${processed}`;

  if (suggestedField) {
    ctx += `\n\n## 推奨ターゲット: ${suggestedField.field}（${suggestedField.reason}）`;
  }

  return { context: ctx, compactCanvasChars: compactCanvasStr.length };
}

export function buildMarketingQuestionPrompt(context: string, roundNum: number, maxRounds: number): string {
  const stage = roundNum <= 2 ? '序盤: 広めに欠損を埋める' : roundNum <= 4 ? '中盤: 仮説を絞り込む' : '終盤: 検証設計に向かう';

  return `質問エンジン: キャンバスの欠損を1つ埋める問いを返せ。
原則は推奨ターゲットを優先。ただしtranscriptに明確な別signalがあればoverride可。
判断か選択を迫る問いを1つ。
禁止: 「どう思いますか」「なぜ」単独、yes/no、既出再質問、抽象言い換え。
ステージ（${roundNum}/${maxRounds}）: ${stage}

${context}

出力（JSON）:
{
  "mirror": "ユーザーの発言を1行で映し返す",
  "question": "判断を迫る具体的な問い",
  "question_type": "gap_fill",
  "question_target_field": "pain"
}
question_typeは gap_fill / hypothesis_compress / validation_design のいずれか。`;
}

// === Parse ===

export function parseMarketingResponse(rawText: string): MarketingRoundResponse | null {
  const text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // mirror + question are essential — without them there's nothing to show
    if (!parsed.mirror || !parsed.question) return null;

    const questionType: QuestionType = VALID_QUESTION_TYPES.includes(parsed.question_type)
      ? parsed.question_type
      : 'gap_fill';

    // question_target_field: try parsed value → infer from canvas_updates → fallback
    let targetField: string = '';
    const rawTarget = parsed.question_target_field || parsed.target_field || parsed.target;
    if (rawTarget && CANVAS_FIELDS.includes(rawTarget)) {
      targetField = rawTarget;
    }

    // Infer from canvas_updates keys if target field is missing
    if (!targetField && parsed.canvas_updates && typeof parsed.canvas_updates === 'object') {
      const updateKeys = Object.keys(parsed.canvas_updates);
      const validKey = updateKeys.find((k) => CANVAS_FIELDS.includes(k as typeof CANVAS_FIELDS[number]));
      if (validKey) targetField = validKey;
    }

    // Last resort: default to first field mentioned in question text
    if (!targetField) {
      for (const field of CANVAS_FIELDS) {
        if (field === 'goal') continue;
        if (parsed.question.includes(FIELD_LABELS[field] || field)) {
          targetField = field;
          break;
        }
      }
    }
    if (!targetField) targetField = 'target_customer';

    return {
      mirror: String(parsed.mirror),
      question: String(parsed.question),
      question_type: questionType,
      question_target_field: targetField,
      canvas_updates: parsed.canvas_updates || {},
    };
  } catch {
    return null;
  }
}

// === Server-side canvas update (current_focus only) ===

export function inferCanvasUpdate(
  targetField: string,
): Partial<MarketingCanvasState> {
  return { current_focus: targetField || null };
}

// === Canvas merge (with status downgrade guard) ===

export function mergeCanvasUpdates(
  current: MarketingCanvasState,
  updates: Partial<MarketingCanvasState>,
): MarketingCanvasState {
  const result = { ...current };

  for (const key of CANVAS_FIELDS) {
    const update = updates[key] as MarketingField | undefined;
    if (!update) continue;

    const currentField = result[key] as MarketingField;

    // Rule 1: AI cannot set 'known' — downgrade to 'assumed'
    let status = update.status;
    if (status === 'known') {
      status = 'assumed';
    }
    // 'conflicted' is allowed from AI (Rule 3)

    if (STRING_FIELDS.has(key)) {
      // Rule 8: null value → keep existing
      if (update.value == null) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = { status, value: String(update.value) };
    } else if (ARRAY_FIELDS.has(key)) {
      const arr = update.value;
      // Rule 7: empty array → keep existing
      if (!Array.isArray(arr) || arr.length === 0) continue;
      // Rule 5: replace (not merge). Rule 6: max 3 items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = { status, value: arr.slice(0, 3).map((v: unknown) => String(v)) };
    }
  }

  // Update current_focus from updates if present
  if ('current_focus' in updates && updates.current_focus !== undefined) {
    result.current_focus = updates.current_focus;
  }

  return result;
}

// === Fallback (3 patterns, skips recently asked fields) ===

const FIELD_LABELS: Record<string, string> = {
  product: 'プロダクト',
  target_customer: 'ターゲット顧客',
  pain: '顧客の痛み',
  trigger_moment: '購買のきっかけ',
  promise: '約束する価値',
  differentiation: '差別化ポイント',
  proof: '信頼の証拠',
  channel: 'チャネル',
  offer: 'オファー',
  next_experiment: '次の実験',
};

// Deeper follow-up questions per field (avoid "まだ空白です" repeat)
const FIELD_DEEPENING_QUESTIONS: Record<string, string[]> = {
  product: [
    '誰のどんな問題を解決するものですか？具体的なシーンで教えてください',
    'そのプロダクトを一言で友人に紹介するとしたら？',
  ],
  target_customer: [
    '一番最初に使ってほしい人を1人だけ思い浮かべると、どんな人ですか？',
    'その人は今日、何に一番困っていますか？',
  ],
  pain: [
    'お金か時間、どちらをより無駄にしている問題ですか？',
    'その痛みを我慢し続けるとどうなりますか？',
  ],
  trigger_moment: [
    'どんな瞬間に「これなんとかしたい」と感じますか？',
    '検索するとしたら、何と打ちますか？',
  ],
  promise: [
    '使った後に「これが変わった」と言ってもらえるとしたら、何が変わりますか？',
    '既存の代替手段と比べて、何が一番違いますか？',
  ],
  differentiation: [
    '競合がやっていないことで、あなたがやれることは何ですか？',
    'お客さんが「これがあるからここを選ぶ」と言う理由は？',
  ],
  proof: [
    '今の時点で信頼性を示せる材料はありますか？実績、数値、声など',
    '最初の10人にどうやって信じてもらいますか？',
  ],
  channel: [
    'ターゲットが一番時間を使っている場所はどこですか？',
    '最初の100人にリーチする最短の方法は？',
  ],
  offer: [
    '最初に試してもらうとき、何を無料にして何を有料にしますか？',
    '「これなら試してみよう」と思わせるフックは？',
  ],
  next_experiment: [
    '今週中に検証できる最小の実験は何ですか？',
    '仮説が間違っていたら一番最初にわかるシグナルは？',
  ],
};

export function generateMarketingFallback(
  transcript: string,
  canvas: MarketingCanvasState,
  prevTargetFields: string[] = [],
  roundNum: number = 1,
): MarketingRoundResponse {
  const { field, reason } = suggestTargetField(canvas, prevTargetFields, roundNum);

  const buildMirror = () =>
    transcript.length > 15
      ? transcript.slice(-80).replace(/^.{0,15}/, '...').trim()
      : '話を整理しています';

  if (reason === '矛盾あり') {
    const label = FIELD_LABELS[field] || field;
    return {
      mirror: buildMirror(),
      question: `「${label}」について方向性が割れているようです。どちらの方向が本命ですか？`,
      question_type: 'hypothesis_compress',
      question_target_field: field,
      canvas_updates: {},
    };
  }

  if (reason === '候補過多') {
    const label = FIELD_LABELS[field] || field;
    return {
      mirror: buildMirror(),
      question: `「${label}」の候補の中で、一番最初に検証したいものはどれですか？`,
      question_type: 'hypothesis_compress',
      question_target_field: field,
      canvas_updates: {},
    };
  }

  if (reason === '検証設計') {
    return {
      mirror: 'キャンバスがかなり埋まってきました',
      question: 'この仮説を来週中に検証するとしたら、最小の実験は何ですか？',
      question_type: 'validation_design',
      question_target_field: 'next_experiment',
      canvas_updates: {},
    };
  }

  // '欠損' — FIELD_DEEPENING_QUESTIONSから質問選択（deterministic: 常に[0]）
  const questions = FIELD_DEEPENING_QUESTIONS[field] || [];
  const question = questions[0]
    || `「${FIELD_LABELS[field] || field}」について聞かせてください`;

  return {
    mirror: buildMirror(),
    question,
    question_type: 'gap_fill',
    question_target_field: field,
    canvas_updates: {},
  };
}

// === Summary ===

export function buildMarketingSummaryPrompt(canvas: MarketingCanvasState): string {
  const canvasText = formatCanvasForPrompt(canvas);

  return `あなたはマーケティング仮説の要約エンジンです。
以下のキャンバス状態から、マーケティング仮説の要約を生成してください。

${canvasText}

## 出力形式（JSONのみ）
{
  "marketing_hypothesis": "一言でマーケティング仮説（40文字以内）",
  "target_hypothesis": "ターゲット仮説（40文字以内）",
  "pain_hypothesis": "ペイン仮説（40文字以内）",
  "promised_value": "約束する価値（40文字以内）",
  "appeal_angles": ["訴求軸1", "訴求軸2", "訴求軸3"],
  "next_experiment": "次の検証実験（具体的、1週間以内に実行可能）"
}

## 制約
- assumed/missing のフィールドは「仮説」として扱い、断定しない
- appeal_anglesは必ず3つ
- next_experimentは具体的なアクション（「考える」「検討する」は禁止）

JSONのみを出力してください。説明不要。`;
}

export function parseMarketingSummaryResponse(rawText: string): MarketingSummary | null {
  const text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.marketing_hypothesis || !parsed.target_hypothesis) return null;

    return {
      marketing_hypothesis: String(parsed.marketing_hypothesis),
      target_hypothesis: String(parsed.target_hypothesis),
      pain_hypothesis: String(parsed.pain_hypothesis || ''),
      promised_value: String(parsed.promised_value || ''),
      appeal_angles: Array.isArray(parsed.appeal_angles)
        ? parsed.appeal_angles.slice(0, 3).map((s: unknown) => String(s))
        : [],
      next_experiment: String(parsed.next_experiment || ''),
    };
  } catch {
    return null;
  }
}
