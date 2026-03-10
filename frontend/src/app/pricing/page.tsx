'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/auth/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import { isNativePlatform, getOfferings, purchasePackage, restorePurchases } from '@/lib/revenuecat';

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
    missing: ['詳細分析レポート', 'AI対話モード (近日公開)', '月次分析レポート', '永久保存'],
  },
  {
    id: 'lite' as const,
    name: 'Lite',
    price: '¥580',
    period: '/ 月',
    color: 'cyan' as const,
    neonColor: 'var(--neon-cyan)',
    packageId: 'kataru_lite_monthly',
    features: [
      '月15回の録音セッション',
      '詳細分析レポート',
      'アクション提案・矛盾検出',
      'レポート永久保存',
    ],
    missing: ['AI対話モード (近日公開)', '月次分析レポート'],
  },
  {
    id: 'standard' as const,
    name: 'Standard',
    price: '¥1,480',
    period: '/ 月',
    color: 'lime' as const,
    neonColor: 'var(--neon-lime)',
    packageId: 'kataru_standard_monthly',
    features: [
      '無制限の録音セッション',
      '詳細分析レポート',
      'アクション提案・矛盾検出',
      'AI対話モード (近日公開)',
      '月次分析レポート',
      'レポート永久保存',
    ],
    missing: [],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = profile?.plan || 'free';
  const isNative = isNativePlatform();

  const handleSubscribe = async (planId: 'lite' | 'standard') => {
    if (!isNative) return;
    setLoading(planId);
    setError(null);
    try {
      const offerings = await getOfferings();
      const current = offerings?.current;
      if (!current) {
        setError('プランの取得に失敗しました');
        return;
      }

      const plan = PLANS.find(p => p.id === planId);
      const pkg = current.availablePackages.find(
        (p: { identifier: string }) => p.identifier === plan?.packageId
      );
      if (!pkg) {
        setError('このプランは現在利用できません');
        return;
      }

      await purchasePackage({
        identifier: pkg.identifier,
        offeringIdentifier: current.identifier,
      });
      await refreshProfile();
    } catch (err) {
      const message = err instanceof Error ? err.message : '購入に失敗しました';
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    setError(null);
    try {
      await restorePurchases();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : '復元に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleManage = () => {
    window.open('https://apps.apple.com/account/subscriptions', '_blank');
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

        {/* Web fallback message */}
        {!isNative && (
          <GlassCard className="p-5 mt-6" variant="cyan">
            <p className="text-[11px] text-hud-white opacity-70 tracking-wide leading-relaxed">
              プランのご購入・変更はiOSアプリからお願いいたします。
            </p>
          </GlassCard>
        )}

        {/* Error message */}
        {error && (
          <div
            className="mt-4 p-3 rounded text-[10px] tracking-wide"
            style={{
              background: 'rgba(255,59,122,0.1)',
              border: '1px solid rgba(255,59,122,0.3)',
              color: 'var(--neon-magenta)',
            }}
          >
            {error}
          </div>
        )}

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

                {isNative && !isCurrent && plan.id !== 'free' && (
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
                    className="w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
                  >
                    サブスクリプション管理
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* Restore purchases */}
        {isNative && (
          <button
            onClick={handleRestore}
            disabled={loading !== null}
            className="mt-4 mb-6 text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border-0 cursor-pointer underline opacity-60"
          >
            {loading === 'restore' ? '復元中...' : '購入を復元'}
          </button>
        )}
      </div>
    </AuthGuard>
  );
}
