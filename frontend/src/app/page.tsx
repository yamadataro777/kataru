'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StatsGrid from '@/components/dashboard/StatsGrid';
import StartModeSelector from '@/components/dashboard/StartModeSelector';
import RecentSessions from '@/components/dashboard/RecentSessions';
import { getSessions, getAnalytics, getConversations } from '@/lib/api';
import { Session } from '@/types/session';
import { Conversation } from '@/types/conversation';
import { getFreeSessionsRemaining, FREE_SESSION_LIMIT } from '@/lib/session-tracker';

export default function HomePage() {
  const [freeRemaining, setFreeRemaining] = useState<number>(FREE_SESSION_LIMIT);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalWords: 0,
    avgDuration: 0,
    totalDuration: 0,
  });

  useEffect(() => {
    setFreeRemaining(getFreeSessionsRemaining());

    getSessions()
      .then(setSessions)
      .catch(() => setSessions([]));

    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]));

    getAnalytics()
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />

      <div className="flex-1 flex flex-col px-5 pb-20">
        <div className="mt-4">
          <h2 className="text-lg font-bold tracking-[2px]">
            Welcome to <span className="text-neon-cyan" style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}>KATARU</span>
          </h2>
        </div>

        <div className="mt-5">
          <StatsGrid
            totalSessions={analytics.totalSessions}
            totalWords={analytics.totalWords}
            avgDuration={analytics.avgDuration}
            totalDuration={analytics.totalDuration}
          />
        </div>

        {freeRemaining <= FREE_SESSION_LIMIT && (
          <div className="mt-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] tracking-[1px] border"
              style={{
                borderColor: freeRemaining > 0 ? 'rgba(0,212,255,0.3)' : 'rgba(255,59,122,0.3)',
                color: freeRemaining > 0 ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                background: freeRemaining > 0 ? 'rgba(0,212,255,0.05)' : 'rgba(255,59,122,0.05)',
              }}
            >
              無料トライアル: 残り {freeRemaining} / {FREE_SESSION_LIMIT} 回
            </span>
          </div>
        )}

        <StartModeSelector />

        <div className="mt-2">
          <RecentSessions sessions={sessions} conversations={conversations} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
