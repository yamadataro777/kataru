/**
 * Round Question Quality Simulation Tests
 * Run: npx tsx src/tests/round-question-simulation.ts
 */

import {
  SessionMemory,
  generateFallbackResponse,
  buildContext,
  buildRoundQuestionPrompt,
  buildRoundQuestionPromptV2,
  buildSummaryPrompt,
  parseRoundResponse,
} from '../prompts/round-question-prompt';

// --- Test helpers ---
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n━━━ ${title} ━━━`);
}

// --- Test data ---
const existingMemory: SessionMemory = {
  working_hypothesis: '転職すべきか現職に留まるか迷っている',
  open_loops: ['チームへの責任感', '家族の期待'],
  core_tension: '安定と挑戦のトレードオフ',
  recent_question_angle: 'tradeoff',
};

// ============================
// Phase 1-A: Fallback Memory
// ============================
section('Phase 1-A: fallbackでメモリ保持');

{
  const res = generateFallbackResponse('転職について悩んでいます。チームに迷惑がかかるのが心配です。', 2, existingMemory);
  assert(res.memory.working_hypothesis === existingMemory.working_hypothesis,
    'working_hypothesis preserved',
    `got: ${res.memory.working_hypothesis}`);
  assert(res.memory.open_loops.length === existingMemory.open_loops.length,
    'open_loops preserved',
    `got: ${JSON.stringify(res.memory.open_loops)}`);
  assert(res.memory.core_tension === existingMemory.core_tension,
    'core_tension preserved',
    `got: ${res.memory.core_tension}`);
}

{
  const res = generateFallbackResponse('悩んでいます。', 1, null);
  assert(res.memory.working_hypothesis === null,
    'null memory → working_hypothesis stays null');
  assert(Array.isArray(res.memory.open_loops),
    'null memory → open_loops is array');
}

// ============================
// Phase 1-A: Fallback質問品質
// ============================
section('Phase 1-A: fallback質問品質');

// Short transcript (<15 chars)
{
  const res = generateFallbackResponse('うーん', 1);
  assert(res.question.includes('ですか'),
    'short transcript → binary question',
    `got: ${res.question}`);
  assert(!res.question.includes('どう思い'),
    'short transcript → no "どう思い"');
}

// Long transcript with keywords
{
  const longText = '最近チームのマネジメントに疲れてきた。メンバーが5人に増えて、1on1の時間が足りない。特に新人のフォローが大変で、自分のコードを書く時間がない。';
  const res = generateFallbackResponse(longText, 1);
  assert(res.mirror.startsWith('「'),
    'long transcript → mirror quotes keyword',
    `got: ${res.mirror}`);
  assert(res.question.length > 20,
    'long transcript → question is substantive',
    `got: ${res.question}`);
}

// No punctuation
{
  const noPunct = 'プロジェクトの方向性が見えなくて困っているんだけどどうしたらいいかわからない';
  const res = generateFallbackResponse(noPunct, 2);
  assert(res.question.length > 10,
    'no punctuation → produces valid question',
    `got: ${res.question}`);
  assert(res.memory !== null,
    'no punctuation → memory not null');
}

// Filler-heavy transcript
{
  const fillerText = 'えーと。あの。まあ。うーん。そうですね。えーと。あの。';
  const res = generateFallbackResponse(fillerText, 1);
  assert(res.question.includes('ですか') || res.question.includes('ますか'),
    'filler-heavy → still produces narrowing question',
    `got: ${res.question}`);
  // Should NOT be generic "一番引っかかっていること" (old fallback)
  assert(!res.question.includes('一番引っかかっていることと、その理由'),
    'filler-heavy → not old generic fallback');
}

// Round-specific fallback questions
{
  const text = '仕事のことで頭がいっぱいです。上司との関係が難しい。';
  const r1 = generateFallbackResponse(text, 1, existingMemory);
  const r2 = generateFallbackResponse(text, 2, existingMemory);
  const r3 = generateFallbackResponse(text, 3, existingMemory);
  assert(r1.question !== r2.question,
    'R1 vs R2 → different questions');
  assert(r2.question !== r3.question,
    'R2 vs R3 → different questions');
  assert(r1.memory.recent_question_angle !== r2.memory.recent_question_angle
    || r2.memory.recent_question_angle !== r3.memory.recent_question_angle,
    'different rounds → different angles');
}

// ============================
// Phase 1-B: open_loops guard
// ============================
section('Phase 1-B: open_loopsガード (buildSummaryPrompt)');

{
  const memoryWithNullLoops = {
    working_hypothesis: 'test',
    open_loops: null as unknown as string[],
    core_tension: null,
    recent_question_angle: 'blindspot' as const,
  };
  try {
    const result = buildSummaryPrompt(['m1'], ['q1'], memoryWithNullLoops, 'transcript');
    assert(typeof result === 'string',
      'null open_loops → no crash');
    assert(!result.includes('undefined'),
      'null open_loops → no "undefined" in output');
  } catch (e) {
    assert(false, 'null open_loops → should not throw', String(e));
  }
}

// ============================
// Phase 2-B: V2 Prompt
// ============================
section('Phase 2-B: V2プロンプト内容');

{
  const ctx = buildContext('テスト', null, 1, []);
  const v1 = buildRoundQuestionPrompt(ctx, 1);
  const v2 = buildRoundQuestionPromptV2(ctx, 1);

  // V2 should have specific techniques
  assert(v2.includes('対比'), 'V2 R1 → contains 対比');
  assert(v2.includes('具体化'), 'V2 R1 → contains 具体化');
  assert(v2.includes('時間軸'), 'V2 R1 → contains 時間軸');

  // V2 should have stricter rules
  assert(v2.includes('「なぜ」単独禁止'), 'V2 → "なぜ"単独禁止 rule');
  assert(v2.includes('再質問禁止'), 'V2 → 再質問禁止 rule');
  assert(v2.includes('二択'), 'V2 → 二択 preference');

  // V2 should have few-shot
  assert(v2.includes('チームへの迷惑'), 'V2 → few-shot example present');

  // V1 should NOT have these
  assert(!v1.includes('対比'), 'V1 → no 対比');
  assert(!v1.includes('再質問禁止'), 'V1 → no 再質問禁止');
}

{
  const ctx2 = buildContext('テスト', null, 2, []);
  const v2r2 = buildRoundQuestionPromptV2(ctx2, 2);
  assert(v2r2.includes('仮定の排除'), 'V2 R2 → contains 仮定の排除');
  assert(v2r2.includes('他者視点'), 'V2 R2 → contains 他者視点');
  assert(v2r2.includes('本音確認'), 'V2 R2 → contains 本音確認');
}

{
  const ctx3 = buildContext('テスト', null, 3, []);
  const v2r3 = buildRoundQuestionPromptV2(ctx3, 3);
  assert(v2r3.includes('最小ステップ'), 'V2 R3 → contains 最小ステップ');
  assert(v2r3.includes('判断基準'), 'V2 R3 → contains 判断基準');
  assert(v2r3.includes('コミット'), 'V2 R3 → contains コミット');
}

// ============================
// Phase 3-A: previousRatings in context
// ============================
section('Phase 3-A: previousRatingsコンテキスト');

{
  const ctx = buildContext(
    'テスト文字起こし',
    existingMemory,
    3,
    ['最初の質問？', '二番目の質問？'],
    ['forward', 'off'],
  );
  assert(ctx.includes('R1 question: 最初の質問？ → 評価: forward'),
    'context includes R1 rating');
  assert(ctx.includes('R2 question: 二番目の質問？ → 評価: off'),
    'context includes R2 rating');
  assert(ctx.includes('評価の解釈'),
    'context includes rating interpretation header');
  assert(ctx.includes('"forward" → 同系統で一段深く'),
    'context includes forward interpretation');
  assert(ctx.includes('"off" → 同じangleを避け'),
    'context includes off interpretation');
}

// Without ratings (backward compat)
{
  const ctx = buildContext('テスト', null, 2, ['質問1？']);
  assert(ctx.includes('R1: 質問1？'),
    'no ratings → old format (no "question:" label)');
  assert(!ctx.includes('評価の解釈'),
    'no ratings → no interpretation section');
}

// With null ratings (partial)
{
  const ctx = buildContext('テスト', null, 2, ['質問1？'], [null]);
  assert(ctx.includes('R1: 質問1？'),
    'null rating → old format for that line');
  assert(!ctx.includes('評価の解釈'),
    'all-null ratings → no interpretation section');
}

// ============================
// Phase 3-B: Analytics columns (simulated)
// ============================
section('Phase 3-B: Analytics保存シミュレーション');

{
  // Simulate what round.ts does when building the INSERT
  const response = {
    mirror: 'test',
    question: 'test?',
    memory: { ...existingMemory, recent_question_angle: 'emotion' as const },
  };
  const useV2 = true;
  const usePrevRatings = true;
  const prevRatings = ['forward', 'neutral'];

  const insertData = {
    question_angle: response.memory.recent_question_angle,
    prompt_version: useV2 ? 'v2' : 'v1',
    used_previous_ratings: usePrevRatings && prevRatings.length > 0,
  };

  assert(insertData.question_angle === 'emotion',
    'question_angle extracted from memory');
  assert(insertData.prompt_version === 'v2',
    'prompt_version = v2 when flag on');
  assert(insertData.used_previous_ratings === true,
    'used_previous_ratings = true when ratings exist');

  // V1 mode
  const insertV1 = {
    prompt_version: false ? 'v2' : 'v1',
    used_previous_ratings: false && prevRatings.length > 0,
  };
  assert(insertV1.prompt_version === 'v1',
    'prompt_version = v1 when flag off');
  assert(insertV1.used_previous_ratings === false,
    'used_previous_ratings = false when flag off');
}

// ============================
// Phase 4: Rollback logic
// ============================
section('Phase 4: ロールバック分岐');

{
  // Simulate env flag logic from round.ts
  const testCases = [
    { env: undefined, expected: true, label: 'undefined → defaults to true' },
    { env: 'true', expected: true, label: '"true" → true' },
    { env: 'false', expected: false, label: '"false" → false' },
    { env: '', expected: true, label: 'empty string → true' },
  ];

  for (const tc of testCases) {
    const result = tc.env !== 'false';
    assert(result === tc.expected, `ROUND_PROMPT_V2=${tc.env} → ${tc.label}`);
  }
}

// ============================
// parseRoundResponse robustness
// ============================
section('Bonus: parseRoundResponse堅牢性');

{
  // Valid response
  const valid = parseRoundResponse(JSON.stringify({
    mirror: 'テストミラー',
    question: 'テスト質問？',
    memory: {
      working_hypothesis: 'テスト仮説',
      open_loops: ['ループ1'],
      core_tension: 'テスト緊張',
      recent_question_angle: 'emotion',
    },
  }));
  assert(valid !== null, 'valid JSON → parsed');
  assert(valid!.memory.recent_question_angle === 'emotion', 'valid angle preserved');
}

{
  // Invalid angle fallback
  const invalid = parseRoundResponse(JSON.stringify({
    mirror: 'm',
    question: 'q',
    memory: {
      working_hypothesis: null,
      open_loops: [],
      core_tension: null,
      recent_question_angle: 'invalid_angle',
    },
  }));
  assert(invalid !== null, 'invalid angle → still parses');
  assert(invalid!.memory.recent_question_angle === 'blindspot', 'invalid angle → defaults to blindspot');
}

{
  // Wrapped in markdown code block
  const wrapped = parseRoundResponse('```json\n{"mirror":"m","question":"q","memory":{"working_hypothesis":null,"open_loops":[],"core_tension":null,"recent_question_angle":"action"}}\n```');
  assert(wrapped !== null, 'markdown-wrapped → parsed');
}

{
  // Garbage input
  const garbage = parseRoundResponse('this is not json at all');
  assert(garbage === null, 'garbage → returns null');
}

// ============================
// Summary
// ============================
console.log(`\n${'═'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'═'.repeat(40)}`);

if (failed > 0) {
  process.exit(1);
}
