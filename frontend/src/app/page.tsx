'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StatsGrid from '@/components/dashboard/StatsGrid';
import StartModeSelector from '@/components/dashboard/StartModeSelector';
import RecentSessions from '@/components/dashboard/RecentSessions';
import TrialJourney from '@/components/dashboard/TrialJourney';
import GlassCard from '@/components/ui/GlassCard';
import AuthGuard from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';
import { getSessions, getAnalytics, getConversations } from '@/lib/api';
import { Session } from '@/types/session';
import { Conversation } from '@/types/conversation';
import { requestNotificationPermission } from '@/lib/notifications';

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalWords: 0,
    avgDuration: 0,
    totalDuration: 0,
  });

  useEffect(() => {
    getSessions()
      .then((data) => {
        setSessions(data);
        // Redirect to onboarding if first-time user
        if (data.length === 0 && !localStorage.getItem('kataru_onboarding_completed')) {
          router.replace('/onboarding');
        }
      })
      .catch(() => setSessions([]));

    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]));

    getAnalytics()
      .then(setAnalytics)
      .catch(() => {});

    // Request notification permission on first visit
    requestNotificationPermission().catch(() => {});
  }, [router]);

  return (
    <AuthGuard>
      <div className="flex flex-col h-dvh overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col px-5 pb-4 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          <div className="mt-4">
            {(() => {
              if (sessions.length === 0) {
                return (
                  <h2 className="text-lg font-bold tracking-[2px]">
                    Welcome to <span className="text-neon-cyan" style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}>KATARU</span>
                  </h2>
                );
              }
              const lastSession = sessions[0]; // sorted by created_at desc
              const daysSinceLast = Math.floor((Date.now() - new Date(lastSession.created_at).getTime()) / 86400000);

              // Calculate weekly streak
              const now = new Date();
              const getWeekNumber = (d: Date) => {
                const start = new Date(d.getFullYear(), 0, 1);
                return Math.floor(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
              };
              const sessionWeeks = new Set(sessions.map(s => {
                const d = new Date(s.created_at);
                return `${d.getFullYear()}-W${getWeekNumber(d)}`;
              }));
              let streak = 0;
              for (let i = 0; i < 52; i++) {
                const checkDate = new Date(now.getTime() - i * 7 * 86400000);
                const weekKey = `${checkDate.getFullYear()}-W${getWeekNumber(checkDate)}`;
                if (sessionWeeks.has(weekKey)) {
                  streak++;
                } else {
                  break;
                }
              }

              return (
                <>
                  <h2 className="text-lg font-bold tracking-[2px]">
                    {daysSinceLast >= 3 ? (
                      <>おかえりなさい</>
                    ) : (
                      <>Welcome to <span className="text-neon-cyan" style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}>KATARU</span></>
                    )}
                  </h2>
                  {daysSinceLast >= 3 && (
                    <p className="text-[10px] text-hud-white-dim tracking-wide mt-1" style={{ fontFamily: 'sans-serif' }}>
                      {daysSinceLast}日ぶりですね。新しい気づきがあるかもしれません。
                    </p>
                  )}
                  {streak >= 2 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] tracking-[1px] text-neon-lime" style={{ textShadow: '0 0 6px rgba(168,255,0,0.3)' }}>
                        {streak}週連続記録中
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="mt-4">
            <TrialJourney />
          </div>

          <div className="mt-4">
            <StatsGrid
              totalSessions={analytics.totalSessions}
              totalWords={analytics.totalWords}
              avgDuration={analytics.avgDuration}
              totalDuration={analytics.totalDuration}
            />
          </div>

          {/* Conclusion Progress + Revisit Prompt */}
          {(() => {
            const completed = sessions.filter(s => s.status === 'completed');
            const withConclusion = completed.filter(s => s.user_conclusion);
            const readyForRevisit = completed.filter(s => {
              if (s.user_conclusion) return false;
              const daysElapsed = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
              return daysElapsed >= 3;
            }).slice(0, 3);

            if (completed.length === 0) return null;

            return (
              <div className="mt-4">
                {/* Conclusion rate indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="label">結論到達</span>
                  <span className="text-[10px] tracking-[1px]" style={{ color: withConclusion.length === completed.length ? 'var(--neon-lime)' : 'var(--hud-white-dim)' }}>
                    {withConclusion.length} / {completed.length} SESSION
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 rounded-full mb-3" style={{ background: 'rgba(232,237,245,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completed.length > 0 ? (withConclusion.length / completed.length) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-lime))',
                      boxShadow: '0 0 8px rgba(168,255,0,0.3)',
                    }}
                  />
                </div>

                {/* Revisit prompt cards */}
                {readyForRevisit.length > 0 && (
                  <>
                    <span className="text-[9px] tracking-[2px] text-hud-white-dim block mb-2">再考の準備ができたセッション</span>
                    <div className="flex flex-col gap-2">
                      {readyForRevisit.map(s => {
                        const daysAgo = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
                        return (
                          <GlassCard
                            key={s.id}
                            className="p-3 cursor-pointer transition-all hover:border-[rgba(0,212,255,0.35)]"
                            variant="cyan"
                            onClick={() => router.push(`/results?id=${s.id}`)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold tracking-wide text-hud-white truncate" style={{ fontFamily: 'sans-serif' }}>
                                {s.report?.title || 'Untitled'}
                              </span>
                              <span className="text-[10px] text-hud-white-dim tracking-[1px] flex-shrink-0 ml-2">
                                {daysAgo}日前
                              </span>
                            </div>
                          </GlassCard>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <StartModeSelector />

          <div className="mt-2">
            <RecentSessions sessions={sessions} conversations={conversations} />
          </div>
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
