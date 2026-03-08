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
      .then(setSessions)
      .catch(() => setSessions([]));

    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]));

    getAnalytics()
      .then(setAnalytics)
      .catch(() => {});
  }, [router]);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh">
        <Header />

        <div className="flex-1 flex flex-col px-5 pb-20">
          <div className="mt-4">
            <h2 className="text-lg font-bold tracking-[2px]">
              Welcome to <span className="text-neon-cyan" style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}>KATARU</span>
            </h2>
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

          {/* Revisit Prompt - Step 3c */}
          {(() => {
            const readyForRevisit = sessions.filter(s => {
              if (s.status !== 'completed' || s.user_conclusion) return false;
              const daysElapsed = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000);
              return daysElapsed >= 3;
            }).slice(0, 3);
            if (readyForRevisit.length === 0) return null;
            return (
              <div className="mt-4">
                <span className="label mb-2 block">再考の準備ができたセッション</span>
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
