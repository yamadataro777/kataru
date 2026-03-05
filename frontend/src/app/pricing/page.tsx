'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import { createCheckoutSession, createPortalSession } from '@/lib/api';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '¥0',
    period: '',
    color: 'default' as const,
    neonColor: 'var(--hud-white)',
    features: [
      '月5回の録音セッション',
      '要約レポート',
      '保存7日間',
    ],
    missing: ['詳細分析レポート', 'AI対話モード', '月次分析レポート', '永久保存'],
  },
  {
    id: 'lite' as const,
    name: 'Lite',
    price: '¥580',
    period: '/ 月',
    color: 'cyan' as const,
    neonColor: 'var(--neon-cyan)',
    features: [
      '月15回の録音セッション',
      '詳細分析レポート',
      'アクション提案・矛盾検出',
      'レポート永久保存',
    ],
    missing: ['AI対話モード', '月次分析レポート'],
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    price: '¥1,480',
    period: '/ 月',
    color: 'lime' as const,
    neonColor: 'var(--neon-lime)',
    features: [
      '無制限の録音セッション',
      '詳細分析レポート',
      'アクション提案・矛盾検出',
      'AI対話モード',
      '月次分析レポート',
      'レポート永久保存',
    ],
    missing: [],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlan = profile?.plan || 'free';

  const handleSubscribe = async (planId: 'lite' | 'standard') => {
    setLoading(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading('manage');
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh px-5 py-6">
        {/* Header */}
        <div className="flex-shrink-0">
          <button
            onClick={() => router.push('/')}
            className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer mb-4 flex items-center gap-1"
          >
            <span>&larr;</span> BACK
          </button>
          <span className="label">PRICING</span>
          <h1 className="text-xl font-bold tracking-[2px] mt-2 text-hud-white">
            プラン選択
          </h1>
          <div className="hud-line mt-3" />
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-4 mt-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <GlassCard key={plan.id} className="p-5" variant={plan.color}>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold tracking-[2px]"
                      style={{ color: plan.neonColor }}
                    >
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-[8px] tracking-[1px] px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(168,255,0,0.15)',
                          color: 'var(--neon-lime)',
                          border: '1px solid rgba(168,255,0,0.3)',
                        }}
                      >
                        現在のプラン
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-hud-white">
                    {plan.price}
                    {plan.period && (
                      <span className="text-[10px] text-hud-white-dim"> {plan.period}</span>
                    )}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ color: plan.neonColor }} className="text-[9px]">&#10003;</span>
                      <span className="text-[10px] text-hud-white opacity-70 tracking-wide">{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-hud-white-dim text-[9px] opacity-30">&#10007;</span>
                      <span className="text-[10px] text-hud-white opacity-30 tracking-wide line-through">{f}</span>
                    </div>
                  ))}
                </div>

                {!isCurrent && plan.id !== 'free' && (
                  <NeonButton
                    variant={plan.color === 'cyan' ? 'cyan' : 'lime'}
                    onClick={() => handleSubscribe(plan.id as 'lite' | 'standard')}
                    disabled={loading !== null}
                    className="w-full"
                  >
                    {loading === plan.id ? 'PROCESSING...' : `${plan.name} に登録`}
                  </NeonButton>
                )}

                {isCurrent && plan.id !== 'free' && (
                  <button
                    onClick={handleManage}
                    disabled={loading !== null}
                    className="w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
                  >
                    {loading === 'manage' ? 'LOADING...' : 'サブスクリプション管理'}
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
