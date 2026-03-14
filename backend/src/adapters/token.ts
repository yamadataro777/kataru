/**
 * Phase 10: Signed Adapter Token
 *
 * PLAYBOOK §0-4「DB読込はセッション毎1回。ラウンド毎の追加クエリ禁止」を遵守するため、
 * adapter_id をサーバー署名付きトークンとしてクライアントに発行し、
 * R2+ では署名検証のみで effectiveAdapterId を復元する。
 *
 * トークン形式: `${adapterId}|${sessionId}|${source}|${mac}`
 *   - mac = HMAC-SHA256(payload, secret) の先頭32文字 (128bit)
 *   - sessionId バインディングにより別セッションでの再利用を防止
 */

import crypto from 'node:crypto';
import { AdapterId, isValidAdapterId } from './registry';

const SEPARATOR = '|';

function getSecret(): string {
  if (process.env.ADAPTER_TOKEN_SECRET) {
    return process.env.ADAPTER_TOKEN_SECRET;
  }
  // SUPABASE_SERVICE_KEY から導出（追加設定不要）
  const key = process.env.SUPABASE_SERVICE_KEY || 'dev-fallback';
  return crypto.createHash('sha256').update(`kataru-adapter-v1:${key}`).digest('hex');
}

function computeMac(payload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 32);
}

export interface AdapterTokenPayload {
  adapterId: AdapterId;
  sessionId: string;
  source: 'manual' | 'auto';
}

/**
 * サーバーが adapter_id を確定した時点で発行する。
 * - POST /session で manual adapter が受理された時
 * - POST /question R1 で auto-detect が採用された時 (dev/live のみ)
 * - manual_live では auto-detect 用トークンを発行しない
 */
export function createAdapterToken(
  adapterId: AdapterId,
  sessionId: string,
  source: 'manual' | 'auto',
): string {
  const payload = [adapterId, sessionId, source].join(SEPARATOR);
  const mac = computeMac(payload);
  return [payload, mac].join(SEPARATOR);
}

/**
 * クライアントから送られたトークンを検証し、ペイロードを復元する。
 * 署名不一致・sessionId 不一致・不正 adapterId → null を返す。
 */
export function verifyAdapterToken(
  token: string,
  expectedSessionId: string,
): AdapterTokenPayload | null {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 4) return null;

  const [adapterId, sessionId, source, mac] = parts;

  // adapterId 検証
  if (!isValidAdapterId(adapterId)) return null;

  // source 検証
  if (source !== 'manual' && source !== 'auto') return null;

  // sessionId バインディング検証
  if (sessionId !== expectedSessionId) return null;

  // MAC 検証（timing-safe）
  const payload = [adapterId, sessionId, source].join(SEPARATOR);
  const expectedMac = computeMac(payload);

  try {
    const macBuf = Buffer.from(mac, 'hex');
    const expectedBuf = Buffer.from(expectedMac, 'hex');
    if (macBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return {
    adapterId: adapterId as AdapterId,
    sessionId,
    source: source as 'manual' | 'auto',
  };
}
