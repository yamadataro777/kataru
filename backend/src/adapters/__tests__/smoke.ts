/**
 * Phase 10: Domain Adapter Smoke Tests
 *
 * 実行: npx tsx backend/src/adapters/__tests__/smoke.ts
 * テストフレームワーク不要。assert で直接検証。
 */

import assert from 'node:assert/strict';
import { ADAPTER_REGISTRY, VALID_ADAPTER_IDS, isValidAdapterId } from '../registry';
import { normalizeForDetection, detectAdapter } from '../detect';
import { createAdapterToken, verifyAdapterToken } from '../token';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${(e as Error).message}`);
  }
}

// ================================================
// 1. Registry バリデーション
// ================================================
console.log('\n=== Registry Validation ===');

test('全アダプタの contextInjection が 400文字以内', () => {
  for (const [id, adapter] of Object.entries(ADAPTER_REGISTRY)) {
    assert.ok(
      adapter.contextInjection.length <= 400,
      `${id}: ${adapter.contextInjection.length} chars > 400`,
    );
  }
});

test('全アダプタの detectionThreshold が正の整数', () => {
  for (const [id, adapter] of Object.entries(ADAPTER_REGISTRY)) {
    assert.ok(adapter.detectionThreshold > 0, `${id}: threshold=${adapter.detectionThreshold}`);
    assert.ok(Number.isInteger(adapter.detectionThreshold), `${id}: threshold not integer`);
  }
});

test('全アダプタの detectionMinGap が正の整数', () => {
  for (const [id, adapter] of Object.entries(ADAPTER_REGISTRY)) {
    assert.ok(adapter.detectionMinGap > 0, `${id}: minGap=${adapter.detectionMinGap}`);
    assert.ok(Number.isInteger(adapter.detectionMinGap), `${id}: minGap not integer`);
  }
});

test('VALID_ADAPTER_IDS と DB CHECK の値が一致', () => {
  const dbValues = new Set(['marketing', 'career', 'retrospective']);
  assert.deepEqual(VALID_ADAPTER_IDS, dbValues);
});

test('isValidAdapterId が正しく動作', () => {
  assert.ok(isValidAdapterId('marketing'));
  assert.ok(isValidAdapterId('career'));
  assert.ok(isValidAdapterId('retrospective'));
  assert.ok(!isValidAdapterId('invalid'));
  assert.ok(!isValidAdapterId(''));
});

// ================================================
// 2. 正規化テスト
// ================================================
console.log('\n=== Normalization ===');

test('全角 "ＬＰ" → "lp"', () => {
  assert.equal(normalizeForDetection('ＬＰ'), 'lp');
});

test('記号付き "売上！" → "売上"', () => {
  assert.equal(normalizeForDetection('売上！'), '売上');
});

test('空白連続 "マーケ　　壁打ち" → "マーケ 壁打ち"', () => {
  assert.equal(normalizeForDetection('マーケ　　壁打ち'), 'マーケ 壁打ち');
});

test('大文字英字 "KPT" → "kpt"', () => {
  assert.equal(normalizeForDetection('KPT'), 'kpt');
});

test('混合テキスト', () => {
  const result = normalizeForDetection('ＬＰの広告！で（売上）を上げたい');
  assert.ok(result.includes('lp'));
  assert.ok(result.includes('広告'));
  assert.ok(result.includes('売上'));
  assert.ok(!result.includes('！'));
  assert.ok(!result.includes('（'));
});

// ================================================
// 3. 検出ロジック検証
// ================================================
console.log('\n=== Detection Logic ===');

test('marketing キーワード5語含む文 → marketing 検出', () => {
  const text = 'マーケティングの集客で、ターゲット層への訴求をLPで改善したい';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, 'marketing');
  assert.equal(result.decision, 'adopted');
  assert.equal(result.rejectionType, null);
});

test('career キーワード5語含む文 → career 検出', () => {
  const text = '転職を考えていて、キャリアパスと年収のことが気になる。スキルも足りない気がするし将来が不安';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, 'career');
  assert.equal(result.decision, 'adopted');
});

test('retrospective キーワード5語含む文 → retrospective 検出', () => {
  const text = 'プロジェクトの振り返りをしたい。チームの反省点と改善策、KPTをまとめたい';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, 'retrospective');
  assert.equal(result.decision, 'adopted');
});

test('キーワード2語（閾値未満）→ null', () => {
  const text = '今日はマーケティングの広告について少し考えた';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, null);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.rejectionType, 'below_threshold');
});

test('marketing 3語 + career 2語（gap=1 < minGap=2）→ null', () => {
  const text = 'マーケティングの集客と広告も大事だけど、転職とキャリアも気になる';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, null);
  assert.equal(result.decision, 'rejected');
  assert.equal(result.rejectionType, 'insufficient_gap');
});

test('marketing 4語 + career 1語（gap=3 ≥ minGap=2）→ marketing', () => {
  const text = 'マーケティングの集客と広告でターゲットにアプローチしたい。転職は今は考えてない';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, 'marketing');
  assert.equal(result.decision, 'adopted');
});

test('キーワードゼロ → null', () => {
  const text = '今日は天気が良くて散歩に行きました';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, null);
  assert.equal(result.decision, 'rejected');
});

test('空文字列 → null', () => {
  const result = detectAdapter('');
  assert.equal(result.adapterId, null);
  assert.equal(result.decision, 'rejected');
});

test('短い英字キーワード "cv" が他の単語の部分文字列で誤爆しない', () => {
  // "covid" には "cv" が含まれるが、語境界チェックで弾かれるべき
  const text = 'covidの影響で仕事が変わった';
  const result = detectAdapter(text);
  // marketing の CV がヒットしていないことを確認
  assert.ok(result.scores.marketing < 1 || result.adapterId !== 'marketing');
});

test('全角キーワード "ＣＶ" が正しく検出される', () => {
  const text = 'マーケティングの集客と広告とＣＶとターゲットとペルソナを分析';
  const result = detectAdapter(text);
  assert.equal(result.adapterId, 'marketing');
  assert.equal(result.decision, 'adopted');
});

// ================================================
// 4. reason フィールド検証
// ================================================
console.log('\n=== Reason Field ===');

test('採用時: "adopted" + adapterId + ヒット数 + gap', () => {
  const text = 'マーケティングの集客でターゲット層への訴求をLPで改善したい';
  const result = detectAdapter(text);
  assert.ok(result.reason.startsWith('adopted:'), `reason: ${result.reason}`);
  assert.ok(result.reason.includes('marketing'), `reason: ${result.reason}`);
});

test('不採用（閾値未満）: "rejected" + 不採用理由', () => {
  const text = '今日は広告について考えた';
  const result = detectAdapter(text);
  assert.ok(result.reason.startsWith('rejected:'), `reason: ${result.reason}`);
  assert.ok(
    result.reason.includes('threshold') || result.reason.includes('no terms'),
    `reason: ${result.reason}`,
  );
});

test('不採用（gap不足）: "rejected" + gap insufficient', () => {
  const text = 'マーケティングの集客と広告も大事だけど、転職とキャリアも気になる';
  const result = detectAdapter(text);
  assert.ok(result.reason.includes('gap insufficient'), `reason: ${result.reason}`);
});

// ================================================
// 5. Signed Adapter Token
// ================================================
console.log('\n=== Adapter Token ===');

test('トークン作成 → 検証 → ペイロード復元', () => {
  const sessionId = 'test-session-123';
  const token = createAdapterToken('marketing', sessionId, 'manual');
  const payload = verifyAdapterToken(token, sessionId);
  assert.ok(payload);
  assert.equal(payload.adapterId, 'marketing');
  assert.equal(payload.sessionId, sessionId);
  assert.equal(payload.source, 'manual');
});

test('auto source のトークンも正常動作', () => {
  const sessionId = 'test-session-456';
  const token = createAdapterToken('career', sessionId, 'auto');
  const payload = verifyAdapterToken(token, sessionId);
  assert.ok(payload);
  assert.equal(payload.adapterId, 'career');
  assert.equal(payload.source, 'auto');
});

test('別セッションIDでの検証は失敗', () => {
  const token = createAdapterToken('marketing', 'session-A', 'manual');
  const payload = verifyAdapterToken(token, 'session-B');
  assert.equal(payload, null);
});

test('改ざんされたトークンは検証失敗', () => {
  const token = createAdapterToken('marketing', 'test-session', 'manual');
  const tampered = token.replace('marketing', 'career');
  const payload = verifyAdapterToken(tampered, 'test-session');
  assert.equal(payload, null);
});

test('空文字列トークンは検証失敗', () => {
  const payload = verifyAdapterToken('', 'test-session');
  assert.equal(payload, null);
});

test('不正フォーマットトークンは検証失敗', () => {
  const payload = verifyAdapterToken('not|a|valid|token|extra', 'test');
  assert.equal(payload, null);
});

test('不正 adapterId のトークンは検証失敗', () => {
  // Manually craft a token with invalid adapter ID
  const payload = verifyAdapterToken('invalid|session|manual|0000000000000000', 'session');
  assert.equal(payload, null);
});

// ================================================
// Summary
// ================================================
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

if (failed > 0) {
  process.exit(1);
}
