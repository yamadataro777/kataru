/**
 * Phase 10: Domain Adapter Auto-Detection
 *
 * R1 transcript からアダプタを自動検出する。
 * conservative設計: 3段ゲート（ユニーク語閾値 + 差分チェック）で誤検出を防ぐ。
 */

import { AdapterId, ADAPTER_REGISTRY, DomainAdapter } from './registry';

export interface DetectionResult {
  adapterId: AdapterId | null;
  scores: Record<AdapterId, number>;
  decision: 'adopted' | 'rejected';
  rejectionType: 'below_threshold' | 'insufficient_gap' | null;
  reason: string;
}

/**
 * 入力テキストを検出用に正規化する。
 * - 全角英数 → 半角
 * - lowercase（英字キーワード LP, KPT 用）
 * - 連続空白 → 単一スペース
 * - 記号除去（句読点、括弧など）
 */
export function normalizeForDetection(text: string): string {
  let normalized = text;

  // 全角英数 → 半角
  normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0),
  );

  // lowercase
  normalized = normalized.toLowerCase();

  // 記号除去（日本語句読点、括弧、記号類）
  normalized = normalized.replace(/[。、！？!?（）()「」『』【】〈〉《》・…―─\-,.;:'"\/\\@#$%^&*+=~`|<>{}\[\]]/g, ' ');

  // 連続空白 → 単一スペース
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * キーワードがテキスト中に「語として」存在するかチェック。
 * 短いキーワード（3文字以下のアルファベット）は語境界チェックを行い、
 * 別単語の一部での誤爆を防ぐ。
 */
function termMatchesInText(term: string, normalizedText: string): boolean {
  // 短い英字キーワード（cv, lp, pj, kpt など）は語境界で囲む
  if (/^[a-z]{1,3}$/.test(term)) {
    const pattern = new RegExp(`(?:^|[^a-z])${escapeRegex(term)}(?:[^a-z]|$)`);
    return pattern.test(normalizedText);
  }
  // それ以外は通常のフレーズ一致（日本語は語境界が曖昧なので includes 相当だが、
  // canonical/alias は十分長い語が多いので誤爆リスクは低い）
  return normalizedText.includes(term);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 1つのアダプタに対してユニークtermヒット数をカウントする。
 */
function countUniqueTermHits(adapter: DomainAdapter, normalizedText: string): number {
  let count = 0;
  for (const term of adapter.detectionTerms) {
    // canonical または aliases のいずれかがヒットしたら 1カウント
    const allForms = [term.canonical, ...term.aliases];
    const normalizedForms = allForms.map((f) => normalizeForDetection(f));
    if (normalizedForms.some((f) => termMatchesInText(f, normalizedText))) {
      count++;
    }
  }
  return count;
}

/**
 * transcript からアダプタを自動検出する（3段ゲート）。
 *
 * 1. ユニークtermカウント
 * 2. 閾値チェック（最高スコア ≥ detectionThreshold）
 * 3. 差分チェック（最高スコア - 2位スコア ≥ detectionMinGap）
 */
export function detectAdapter(transcript: string): DetectionResult {
  const normalizedText = normalizeForDetection(transcript);

  // 各アダプタのスコアを計算
  const scores: Record<string, number> = {};
  for (const [id, adapter] of Object.entries(ADAPTER_REGISTRY)) {
    scores[id] = countUniqueTermHits(adapter, normalizedText);
  }

  // スコア順にソート
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topId, topScore] = sorted[0];
  const secondScore = sorted.length > 1 ? sorted[1][1] : 0;
  const topAdapter = ADAPTER_REGISTRY[topId as AdapterId];

  // ゲート1: 空入力 or スコアゼロ
  if (topScore === 0) {
    return {
      adapterId: null,
      scores: scores as Record<AdapterId, number>,
      decision: 'rejected',
      rejectionType: 'below_threshold',
      reason: `rejected: no terms matched`,
    };
  }

  // ゲート2: 閾値チェック
  if (topScore < topAdapter.detectionThreshold) {
    return {
      adapterId: null,
      scores: scores as Record<AdapterId, number>,
      decision: 'rejected',
      rejectionType: 'below_threshold',
      reason: `rejected: below threshold: max=${topScore} < threshold=${topAdapter.detectionThreshold}`,
    };
  }

  // ゲート3: 差分チェック
  const gap = topScore - secondScore;
  if (gap < topAdapter.detectionMinGap) {
    const secondId = sorted[1]?.[0] ?? 'none';
    return {
      adapterId: null,
      scores: scores as Record<AdapterId, number>,
      decision: 'rejected',
      rejectionType: 'insufficient_gap',
      reason: `rejected: gap insufficient: ${topId}=${topScore}, ${secondId}=${secondScore}, gap=${gap} < minGap=${topAdapter.detectionMinGap}`,
    };
  }

  // 全ゲート通過 → 採用
  return {
    adapterId: topId as AdapterId,
    scores: scores as Record<AdapterId, number>,
    decision: 'adopted',
    rejectionType: null,
    reason: `adopted: ${topId}=${topScore}, gap=${gap} (2nd: ${sorted[1]?.[0] ?? 'none'}=${secondScore})`,
  };
}
