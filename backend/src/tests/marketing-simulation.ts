/**
 * Marketing prompt simulation tests
 * Run: npx tsx backend/src/tests/marketing-simulation.ts
 */

import {
  createEmptyCanvas,
  mergeCanvasUpdates,
  formatCanvasForPrompt,
  formatCanvasCompact,
  suggestTargetField,
  inferCanvasUpdate,
  generateMarketingFallback,
  parseMarketingResponse,
  buildMarketingQuestionPrompt,
  buildMarketingContext,
  MarketingCanvasState,
  MarketingField,
} from '../prompts/marketing-prompt';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    failed++;
  }
}

// --- createEmptyCanvas ---
console.log('\n== createEmptyCanvas ==');

const emptyCanvas = createEmptyCanvas();
assert(emptyCanvas.goal.status === 'missing', 'no goal → missing');
assert(emptyCanvas.goal.value === null, 'no goal → null value');
assert(emptyCanvas.product.status === 'missing', 'product is missing');
assert(emptyCanvas.target_customer.status === 'missing', 'target_customer is missing');

const goalCanvas = createEmptyCanvas('SaaS LP訴求軸');
assert(goalCanvas.goal.status === 'known', 'with goal → known');
assert(goalCanvas.goal.value === 'SaaS LP訴求軸', 'goal value set');

// --- mergeCanvasUpdates ---
console.log('\n== mergeCanvasUpdates ==');

// AI returns 'known' → downgraded to 'assumed'
const base = createEmptyCanvas('test');
const merged1 = mergeCanvasUpdates(base, {
  product: { status: 'known', value: 'MyProduct' },
} as Partial<MarketingCanvasState>);
assert(merged1.product.status === 'assumed', 'AI known → downgraded to assumed');
assert(merged1.product.value === 'MyProduct', 'value preserved');

// 'conflicted' passes through
const merged2 = mergeCanvasUpdates(base, {
  target_customer: { status: 'conflicted', value: 'BtoB/BtoC混在' },
} as Partial<MarketingCanvasState>);
assert(merged2.target_customer.status === 'conflicted', 'conflicted passes through');

// Array field: replace (not merge)
const baseWithPain = { ...base, pain: { status: 'assumed' as const, value: ['既存A', '既存B'] } };
const merged3 = mergeCanvasUpdates(baseWithPain, {
  pain: { status: 'assumed', value: ['新X', '新Y'] },
} as Partial<MarketingCanvasState>);
assert(JSON.stringify(merged3.pain.value) === JSON.stringify(['新X', '新Y']), 'array field replaced');

// Array max 3 items
const merged4 = mergeCanvasUpdates(base, {
  channel: { status: 'assumed', value: ['A', 'B', 'C', 'D', 'E'] },
} as Partial<MarketingCanvasState>);
assert((merged4.channel.value as string[]).length === 3, 'array max 3 items');

// Empty array → keep existing
const baseWithChannel = { ...base, channel: { status: 'assumed' as const, value: ['SNS'] } };
const merged5 = mergeCanvasUpdates(baseWithChannel, {
  channel: { status: 'assumed', value: [] },
} as Partial<MarketingCanvasState>);
assert((merged5.channel.value as string[]).length === 1, 'empty array keeps existing');
assert((merged5.channel.value as string[])[0] === 'SNS', 'empty array preserves value');

// null value → keep existing
const baseWithProduct = { ...base, product: { status: 'assumed' as const, value: 'Existing' } };
const merged6 = mergeCanvasUpdates(baseWithProduct, {
  product: { status: 'assumed', value: null },
} as Partial<MarketingCanvasState>);
assert(merged6.product.value === 'Existing', 'null value keeps existing');

// --- formatCanvasForPrompt ---
console.log('\n== formatCanvasForPrompt ==');

const formatted = formatCanvasForPrompt(goalCanvas);
assert(formatted.includes('goal [known]: SaaS LP訴求軸'), 'includes goal with status');
assert(formatted.includes('product [missing]'), 'includes missing product');
assert(formatted.includes('キャンバス状態'), 'includes header');

// --- formatCanvasCompact ---
console.log('\n== formatCanvasCompact ==');

const compactOutput = formatCanvasCompact(goalCanvas);
const fullOutput = formatCanvasForPrompt(goalCanvas);
assert(compactOutput.length < fullOutput.length, 'compact is shorter than full format');
assert(compactOutput.includes('[空]'), 'compact shows missing fields as [空]');

const halfCanvas = createEmptyCanvas('test');
halfCanvas.product = { status: 'assumed', value: 'MySaaS' };
halfCanvas.target_customer = { status: 'assumed', value: 'エンジニア' };
const halfCompact = formatCanvasCompact(halfCanvas);
assert(halfCompact.includes('確定/仮説:'), 'compact shows filled fields');
assert(halfCompact.includes('要注目:'), 'compact shows attention fields');

// --- suggestTargetField ---
console.log('\n== suggestTargetField ==');

// conflicted takes priority
const conflictedCanvas2 = createEmptyCanvas('test');
(conflictedCanvas2.pain as MarketingField).status = 'conflicted';
const suggest1 = suggestTargetField(conflictedCanvas2);
assert(suggest1.field === 'pain', 'conflicted field prioritized');
assert(suggest1.reason === '矛盾あり', 'reason is 矛盾あり');

// skip recent targets
const suggest2 = suggestTargetField(conflictedCanvas2, ['pain']);
assert(suggest2.field !== 'pain', 'skips recently targeted pain');

// missing field
const suggest3 = suggestTargetField(createEmptyCanvas('test'));
assert(suggest3.reason === '欠損', 'missing field reason is 欠損');
assert(suggest3.field !== 'goal', 'does not suggest goal');

// --- suggestTargetField stage-aware ---
console.log('\n== suggestTargetField stage-aware ==');

// R1: foundations
const suggestR1 = suggestTargetField(createEmptyCanvas('test'), [], 1);
assert(['product', 'target_customer', 'pain'].includes(suggestR1.field), 'R1 targets foundations');

// R4: stage-appropriate (core bug fix test)
const suggestR4 = suggestTargetField(createEmptyCanvas('test'), ['product', 'target_customer', 'pain'], 4);
assert(['promise', 'differentiation', 'channel', 'proof'].includes(suggestR4.field),
  'R4 suggests stage-appropriate field (promise/differentiation/channel/proof)');

// R5: validation
const suggestR5 = suggestTargetField(createEmptyCanvas('test'), ['product', 'target_customer', 'pain', 'trigger_moment'], 5);
assert(['next_experiment', 'offer', 'channel', 'proof'].includes(suggestR5.field), 'R5 targets validation fields');

// R4 with some stage fields skipped → selects remaining stage candidates
const suggestStageRemain = suggestTargetField(createEmptyCanvas('test'), ['promise', 'differentiation'], 4);
assert(['channel', 'proof'].includes(suggestStageRemain.field),
  'R4 with promise/diff skipped → selects channel or proof from stage');

// R4 with all stage candidates filled → falls through to Tier 2 (CANVAS_FIELDS)
const filledStageCanvas = createEmptyCanvas('test');
filledStageCanvas.promise = { status: 'assumed', value: 'X' };
filledStageCanvas.differentiation = { status: 'assumed', value: ['A'] };
filledStageCanvas.channel = { status: 'assumed', value: ['B'] };
filledStageCanvas.proof = { status: 'assumed', value: ['C'] };
const suggestTier2 = suggestTargetField(filledStageCanvas, [], 4);
assert(!['promise', 'differentiation', 'channel', 'proof'].includes(suggestTier2.field),
  'R4 with all stage fields filled → falls through to Tier 2');
assert(suggestTier2.field !== 'goal', 'Tier 2 still skips goal');

// --- inferCanvasUpdate ---
console.log('\n== inferCanvasUpdate ==');

const update1 = inferCanvasUpdate('pain');
assert(update1.current_focus === 'pain', 'sets current_focus to target field');
assert(Object.keys(update1).length === 1, 'only sets current_focus');

const update2 = inferCanvasUpdate('');
assert(update2.current_focus === null, 'empty string → null');

// --- generateMarketingFallback ---
console.log('\n== generateMarketingFallback ==');

// Priority: conflicted > 候補過多 > missing
const conflictedCanvas = createEmptyCanvas('test');
(conflictedCanvas.target_customer as MarketingField).status = 'conflicted';
const fb1 = generateMarketingFallback('test transcript', conflictedCanvas);
assert(fb1.question_type === 'hypothesis_compress', 'conflicted → hypothesis_compress');
assert(fb1.question_target_field === 'target_customer', 'targets conflicted field');

// Array with 3+ items → compress
const manyPainCanvas = createEmptyCanvas('test');
manyPainCanvas.pain = { status: 'assumed', value: ['A', 'B', 'C'] };
manyPainCanvas.product = { status: 'assumed', value: 'X' };
manyPainCanvas.target_customer = { status: 'assumed', value: 'Y' };
const fb2 = generateMarketingFallback('test', manyPainCanvas);
assert(fb2.question_type === 'hypothesis_compress', '3+ items → hypothesis_compress');
assert(fb2.question_target_field === 'pain', 'targets overpopulated field');

// Missing → gap_fill
const fb3 = generateMarketingFallback('test transcript here', createEmptyCanvas('test'));
assert(fb3.question_type === 'gap_fill', 'missing → gap_fill');
assert(fb3.question_target_field !== '', 'question_target_field is set');

// Skips recently asked fields
const skipCanvas = createEmptyCanvas('test');
const fb4 = generateMarketingFallback('test', skipCanvas, ['product']);
assert(fb4.question_target_field !== 'product', 'skips recently asked product');

const fb5 = generateMarketingFallback('test', skipCanvas, ['product', 'target_customer']);
assert(fb5.question_target_field !== 'product', 'skips product (2 prev)');
assert(fb5.question_target_field !== 'target_customer', 'skips target_customer (2 prev)');

// --- parseMarketingResponse ---
console.log('\n== parseMarketingResponse ==');

// Valid JSON
const validJson = JSON.stringify({
  mirror: 'テストミラー',
  question: 'テスト質問？',
  question_type: 'gap_fill',
  question_target_field: 'pain',
  canvas_updates: { pain: { status: 'assumed', value: ['テスト'] } },
});
const parsed1 = parseMarketingResponse(validJson);
assert(parsed1 !== null, 'valid JSON parsed');
assert(parsed1!.mirror === 'テストミラー', 'mirror extracted');
assert(parsed1!.question_target_field === 'pain', 'question_target_field extracted');

// Invalid JSON
const parsed2 = parseMarketingResponse('not json at all');
assert(parsed2 === null, 'invalid JSON returns null');

// Markdown-wrapped JSON
const wrappedJson = '```json\n' + validJson + '\n```';
const parsed3 = parseMarketingResponse(wrappedJson);
assert(parsed3 !== null, 'markdown-wrapped JSON parsed');

// Missing question_target_field → inferred from canvas_updates
const noTargetButUpdates = JSON.stringify({
  mirror: 'テスト',
  question: '質問？',
  question_type: 'gap_fill',
  canvas_updates: { pain: { status: 'assumed', value: ['X'] } },
});
const parsed4 = parseMarketingResponse(noTargetButUpdates);
assert(parsed4 !== null, 'missing target_field + canvas_updates → inferred, not null');
assert(parsed4!.question_target_field === 'pain', 'inferred target_field from canvas_updates');

// Missing target_field AND no canvas_updates → still succeeds with default
const noTargetNoUpdates = JSON.stringify({
  mirror: 'テスト',
  question: '質問？',
});
const parsed5 = parseMarketingResponse(noTargetNoUpdates);
assert(parsed5 !== null, 'missing target_field + no updates → still parsed');
assert(parsed5!.question_target_field === 'target_customer', 'defaults to target_customer');

// No mirror → null (essential field)
const noMirror = JSON.stringify({ question: '質問？', question_target_field: 'pain' });
const parsed6 = parseMarketingResponse(noMirror);
assert(parsed6 === null, 'no mirror → null');

// --- buildMarketingQuestionPrompt ---
console.log('\n== buildMarketingQuestionPrompt ==');

const ctxResult = buildMarketingContext('テスト発言', createEmptyCanvas('goal'), 1, []);
const prompt = buildMarketingQuestionPrompt(ctxResult.context, 1, 5);
assert(!prompt.includes('canvas_updates'), 'canvas_updates NOT in prompt output instructions');
assert(prompt.includes('override可'), 'override可 is in prompt');
assert(prompt.includes('question_target_field'), 'question_target_field instruction in prompt');
assert(prompt.includes('gap_fill'), 'gap_fill in prompt');

// --- buildMarketingContext ---
console.log('\n== buildMarketingContext ==');

const ctxWithSuggestion = buildMarketingContext(
  'テスト発言', createEmptyCanvas('goal'), 1, [],
  undefined, { field: 'product', reason: '欠損' },
);
assert(ctxWithSuggestion.context.includes('推奨ターゲット: product'), 'context includes suggested field');
assert(ctxWithSuggestion.context.includes('欠損'), 'context includes reason');
assert(ctxWithSuggestion.compactCanvasChars > 0, 'compactCanvasChars is positive');

// compact canvas is used (not full format)
assert(!ctxWithSuggestion.context.includes('キャンバス状態:'), 'uses compact canvas, not full format');

// --- generateMarketingFallback stage-aware ---
console.log('\n== generateMarketingFallback stage-aware ==');

const fbR4 = generateMarketingFallback('test transcript', createEmptyCanvas('test'), ['product', 'target_customer', 'pain'], 4);
assert(['promise', 'differentiation', 'channel', 'proof'].includes(fbR4.question_target_field),
  'R4 fallback targets stage-appropriate field');

// Deterministic: same input → same output
const fbDet1 = generateMarketingFallback('test', createEmptyCanvas('test'), ['product', 'target_customer', 'pain'], 4);
const fbDet2 = generateMarketingFallback('test', createEmptyCanvas('test'), ['product', 'target_customer', 'pain'], 4);
assert(fbDet1.question === fbDet2.question, 'fallback is deterministic');

// R4 fallback does NOT return product fallback question (regression test)
assert(fbDet1.question !== 'そのプロダクトを一言で友人に紹介するとしたら？',
  'R4 fallback does not return product fallback question');
assert(fbDet1.question_target_field !== 'product',
  'R4 fallback does not target product');

// --- Prompt format ---
console.log('\n== Prompt format (no pipe in enum) ==');

const ctxForFormat = buildMarketingContext('テスト', createEmptyCanvas('goal'), 1, []);
const promptForFormat = buildMarketingQuestionPrompt(ctxForFormat.context, 1, 5);
assert(!promptForFormat.includes('gap_fill|'), 'no pipe in enum values');
assert(promptForFormat.includes('"question_type": "gap_fill"'), 'concrete example value in prompt');

// --- Compact canvas separator ---
console.log('\n== Compact canvas separator ==');

const sepCanvas = createEmptyCanvas('test');
sepCanvas.product = { status: 'assumed', value: 'MySaaS' };
sepCanvas.target_customer = { status: 'assumed', value: 'エンジニア' };
const compactSep = formatCanvasCompact(sepCanvas);
assert(!compactSep.includes(' | '), 'no pipe separator');
assert(compactSep.includes(' / '), 'uses slash separator');

// --- Summary ---
console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
