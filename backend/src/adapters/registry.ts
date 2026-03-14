/**
 * Phase 10: Domain Adapter Registry
 *
 * 領域特化コンテキストの定義。コアプロンプトは変更しない。
 * contextInjection は ≤400文字の参考情報として注入される。
 */

export type AdapterId = 'marketing' | 'career' | 'retrospective';

export interface DetectionTerm {
  canonical: string;
  aliases: string[];
}

export interface DomainAdapter {
  id: AdapterId;
  label: string;
  icon: string;
  detectionTerms: DetectionTerm[];
  detectionThreshold: number;
  detectionMinGap: number;
  contextInjection: string;
}

export const ADAPTER_REGISTRY: Record<AdapterId, DomainAdapter> = {
  marketing: {
    id: 'marketing',
    label: 'マーケ壁打ち',
    icon: '📊',
    detectionTerms: [
      { canonical: 'マーケ', aliases: ['マーケティング', 'マーケ壁打ち'] },
      { canonical: '集客', aliases: [] },
      { canonical: 'ターゲット', aliases: ['ターゲット層'] },
      { canonical: '訴求', aliases: [] },
      { canonical: 'LP', aliases: ['lp', 'ランディングページ'] },
      { canonical: '広告', aliases: [] },
      { canonical: 'コンバージョン', aliases: ['CV'] },
      { canonical: '売上', aliases: [] },
      { canonical: '顧客', aliases: ['カスタマー'] },
      { canonical: 'ペルソナ', aliases: [] },
      { canonical: '差別化', aliases: [] },
      { canonical: 'チャネル', aliases: [] },
    ],
    detectionThreshold: 3,
    detectionMinGap: 2,
    contextInjection:
      'この話題はビジネス・マーケティング領域に関連しているようです。参考として以下を意識してください（コアルールが常に優先）:\n' +
      '- Echo: ビジネス上の仮定や前提を映し返す\n' +
      '- Sense: 市場仮説の盲点や未検証の前提を浮かび上がらせる\n' +
      '- Next: 検証可能なアクションや実験に寄せた問いを投げる',
  },
  career: {
    id: 'career',
    label: 'キャリア',
    icon: '🧭',
    detectionTerms: [
      { canonical: '転職', aliases: [] },
      { canonical: 'キャリア', aliases: ['キャリアパス'] },
      { canonical: '仕事辞め', aliases: ['仕事辞めたい', '辞めたい'] },
      { canonical: '昇進', aliases: [] },
      { canonical: '年収', aliases: ['給料', '給与'] },
      { canonical: 'スキル', aliases: [] },
      { canonical: '業界', aliases: [] },
      { canonical: 'やりがい', aliases: [] },
      { canonical: '向いている', aliases: ['向いてない'] },
      { canonical: '将来', aliases: [] },
    ],
    detectionThreshold: 3,
    detectionMinGap: 2,
    contextInjection:
      'この話題はキャリア・仕事の方向性に関連しているようです。参考として以下を意識してください（コアルールが常に優先）:\n' +
      '- Echo: 価値観や本音を映し返す\n' +
      '- Sense: 外的制約と本音の間にあるギャップを浮かび上がらせる\n' +
      '- Next: リスク評価やタイムラインに寄せた問いを投げる',
  },
  retrospective: {
    id: 'retrospective',
    label: '振り返り',
    icon: '🔄',
    detectionTerms: [
      { canonical: '振り返り', aliases: ['ふりかえり', 'レトロスペクティブ'] },
      { canonical: 'プロジェクト', aliases: ['PJ'] },
      { canonical: '反省', aliases: [] },
      { canonical: '改善', aliases: [] },
      { canonical: 'チーム', aliases: [] },
      { canonical: 'うまくいった', aliases: ['うまくいかなかった'] },
      { canonical: '失敗', aliases: [] },
      { canonical: '次回', aliases: [] },
      { canonical: 'KPT', aliases: ['kpt'] },
      { canonical: '学び', aliases: [] },
    ],
    detectionThreshold: 3,
    detectionMinGap: 2,
    contextInjection:
      'この話題はプロジェクトや活動の振り返りに関連しているようです。参考として以下を意識してください（コアルールが常に優先）:\n' +
      '- Echo: 事実や出来事を映し返す\n' +
      '- Sense: 構造的なパターンや繰り返しを浮かび上がらせる\n' +
      '- Next: プロセス改善や次のアクションに寄せた問いを投げる',
  },
};

// --- Validation exports ---

export const VALID_ADAPTER_IDS = new Set<string>(Object.keys(ADAPTER_REGISTRY));

export function isValidAdapterId(id: string): id is AdapterId {
  return VALID_ADAPTER_IDS.has(id);
}

// --- 起動時バリデーション ---

for (const [id, adapter] of Object.entries(ADAPTER_REGISTRY)) {
  if (adapter.contextInjection.length > 400) {
    throw new Error(
      `Adapter "${id}" contextInjection exceeds 400 chars (${adapter.contextInjection.length})`,
    );
  }
  if (adapter.detectionThreshold < 1 || !Number.isInteger(adapter.detectionThreshold)) {
    throw new Error(`Adapter "${id}" detectionThreshold must be a positive integer`);
  }
  if (adapter.detectionMinGap < 1 || !Number.isInteger(adapter.detectionMinGap)) {
    throw new Error(`Adapter "${id}" detectionMinGap must be a positive integer`);
  }
}
