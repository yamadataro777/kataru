'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import StartModeSelector from '@/components/dashboard/StartModeSelector';
import AuthGuard from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';
import { getSessions } from '@/lib/api';
import { Session } from '@/types/session';
import GlassCard from '@/components/ui/GlassCard';

export default function HomePage() {
  const router = useRouter();
  const [latestSession, setLatestSession] = useState<Session | null>(null);

  useEffect(() => {
    getSessions()
      .then((data) => {
        const completed = data.filter(s => s.status === 'completed');
        if (completed.length > 0) {
          setLatestSession(completed[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AuthGuard>
      <div className="flex flex-col h-dvh overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col px-5 pb-4 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          <StartModeSelector />

          {/* Latest session */}
          {latestSession && latestSession.report && (
            <div className="mt-4">
              <button
                onClick={() => router.push(`/results?id=${latestSession.id}`)}
                className="w-full text-left cursor-pointer bg-transparent border-0 p-0"
              >
                <GlassCard className="p-3">
                  <p className="text-xs font-bold tracking-[1px] text-hud-white truncate">
                    {latestSession.report.title}
                  </p>
                  {(latestSession.report.blockage || latestSession.report.summary) && (
                    <p className="text-[10px] text-hud-white-dim tracking-wide mt-1 leading-5">
                      {(latestSession.report.blockage || latestSession.report.summary || '').slice(0, 60)}
                    </p>
                  )}
                  <p className="text-[9px] text-hud-white-dim tracking-[1px] mt-1.5">
                    {new Date(latestSession.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </p>
                </GlassCard>
              </button>
            </div>
          )}

          {/* Archive link */}
          <div className="mt-3">
            <button
              onClick={() => router.push('/archive')}
              className="text-[10px] tracking-[1px] text-neon-cyan bg-transparent border-0 cursor-pointer"
              style={{ textShadow: '0 0 8px rgba(0,212,255,0.2)' }}
            >
              過去の記録を見る &rarr;
            </button>
          </div>

          {/* Privacy note */}
          <div className="mt-auto pt-6 pb-2">
            <div className="flex items-start gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(232,237,245,0.3)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <div>
                <p className="text-[9px] text-hud-white-dim tracking-wide leading-4">
                  録音内容は端末とあなたのアカウントにのみ保存されます
                </p>
                <button
                  onClick={() => router.push('/privacy')}
                  className="text-[9px] text-neon-cyan bg-transparent border-0 cursor-pointer tracking-[1px] mt-1 p-0"
                  style={{ opacity: 0.6 }}
                >
                  保存方法と削除方法を見る &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
