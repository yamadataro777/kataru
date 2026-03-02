'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StatsGrid from '@/components/dashboard/StatsGrid';
import StartModeSelector from '@/components/dashboard/StartModeSelector';
import RecentSessions from '@/components/dashboard/RecentSessions';
import { useRouter } from 'next/navigation';
import { getSessions, getAnalytics, getConversations } from '@/lib/api';
import { Session } from '@/types/session';
import { Conversation } from '@/types/conversation';
import { needsFeedback } from '@/lib/session-tracker';

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
    if (needsFeedback()) {
      router.push('/feedback');
      return;
    }

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

        <StartModeSelector />

        <div className="mt-2">
          <RecentSessions sessions={sessions} conversations={conversations} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
