'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import MonthlyInsight from '@/components/analytics/MonthlyInsight';
import PendingActions from '@/components/analytics/PendingActions';
import RecurringThemes from '@/components/analytics/RecurringThemes';
import ThinkingTimeline from '@/components/analytics/ThinkingTimeline';
import UsageCard from '@/components/analytics/UsageCard';
import { getAnalytics, AnalyticsData } from '@/lib/api';
import { getFreeSessionsUsed, FREE_SESSION_LIMIT } from '@/lib/session-tracker';

const PAID_SESSION_LIMIT = 15;

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [sessionUsed, setSessionUsed] = useState(0);
  const [sessionLimit, setSessionLimit] = useState(FREE_SESSION_LIMIT);

  useEffect(() => {
    getAnalytics()
      .then((data) => {
        setAnalytics(data);
        // Proxy: if any pending actions exist, user has paid reports (action_items is paid-only)
        const paid = data.pendingActions.length > 0;
        setIsPaid(paid);
        if (paid) {
          setSessionUsed(data.monthlySessionCount);
          setSessionLimit(PAID_SESSION_LIMIT);
        } else {
          setSessionUsed(getFreeSessionsUsed());
          setSessionLimit(FREE_SESSION_LIMIT);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />

      <div className="flex-1 px-5 pb-20">
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
              limit={sessionLimit}
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
  );
}
