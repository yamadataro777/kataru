'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StartModeSelector from '@/components/dashboard/StartModeSelector';
import RecentSessions from '@/components/dashboard/RecentSessions';
import AuthGuard from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';
import { getSessions, getConversations } from '@/lib/api';
import { Session } from '@/types/session';
import { Conversation } from '@/types/conversation';
import { requestNotificationPermission } from '@/lib/notifications';

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    getSessions()
      .then((data) => {
        setSessions(data);
      })
      .catch(() => setSessions([]));

    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]));

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
