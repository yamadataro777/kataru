'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import MonthlyInsight from '@/components/analytics/MonthlyInsight';
import PendingActions from '@/components/analytics/PendingActions';
import RecurringThemes from '@/components/analytics/RecurringThemes';
import ThinkingTimeline from '@/components/analytics/ThinkingTimeline';
import UsageCard from '@/components/analytics/UsageCard';
import AuthGuard from '@/components/auth/AuthGuard';
import { getAnalytics, AnalyticsData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FREE_SESSION_LIMIT, getPlanLimits } from '@/lib/session-tracker';

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const plan = profile?.plan || 'free';
  const isPaid = plan !== 'free';
  const limits = getPlanLimits(plan);
  const sessionUsed = isPaid ? (analytics?.monthlySessionCount || 0) : (profile?.free_sessions_used || 0);
  const sessionLimit = limits.sessions === Infinity ? -1 : limits.sessions;

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="flex flex-col h-dvh overflow-hidden">
        <Header />

        <div className="flex-1 px-5 pb-4 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          <div className="mt-4 mb-5">
            <span className="label">THINKING MAP</span>
            <h2 className="text-lg font-bold tracking-[2px] mt-1">思考マップ</h2>
            <div className="hud-line mt-3" />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <span
                className="text-xs tracking-[3px] text-neon-cyan"
                style={{ animation: 'neon-flicker 2s ease infinite' }}
              >
                LOADING...
              </span>
            </div>
          ) : analytics ? (
            <div className="flex flex-col gap-4">
              <MonthlyInsight
                topicCounts={analytics.topicCounts}
                monthlySessionCount={analytics.monthlySessionCount}
              />
              <PendingActions
                actions={analytics.pendingActions}
                isPaid={isPaid}
              />
              <RecurringThemes topicCounts={analytics.topicCounts} />
              <ThinkingTimeline
                sessions={analytics.recentSessions}
                isPaid={isPaid}
              />
              <UsageCard
                used={sessionUsed}
                limit={sessionLimit === -1 ? FREE_SESSION_LIMIT : sessionLimit}
                isPaid={isPaid}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[12px] text-hud-white-dim" style={{ fontFamily: 'sans-serif' }}>
                データの読み込みに失敗しました
              </p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
