/**
 * Crisis Resources — Phase 2
 * 連絡先確認完了後に verified: true にして有効化する
 */

export interface CrisisResource {
  name: string;
  contact: string;
  type: 'phone' | 'chat' | 'text';
  locale?: string;
  description?: string;
  availabilityNote?: string;
  verified?: boolean;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'いのちの電話',
    contact: '0570-783-556',
    type: 'phone',
    locale: 'ja-JP',
    availabilityNote: '24時間対応',
    verified: false,
  },
  {
    name: 'よりそいホットライン',
    contact: '0120-279-338',
    type: 'phone',
    locale: 'ja-JP',
    availabilityNote: '24時間対応・通話無料',
    verified: false,
  },
];

// production default。verified resources が0件の場合はこれを使う
export const CRISIS_FALLBACK_TEXT = '専門の相談窓口に連絡することもできます。つらい時は一人で抱えないでください。';
