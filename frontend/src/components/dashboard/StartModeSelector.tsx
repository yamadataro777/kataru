'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasFreeSessions } from '@/lib/session-tracker';

export default function StartModeSelector() {
  const router = useRouter();
  const { profile } = useAuth();
  const [canRecord, setCanRecord] = useState(true);

  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;

  useEffect(() => {
    setCanRecord(hasFreeSessions(plan, freeSessionsUsed));
  }, [plan, freeSessionsUsed]);

  return (
    <div className="flex flex-col items-center py-8">
      <button
        onClick={() => {
          if (canRecord) {
            router.push('/record');
          }
        }}
        className="
          relative w-full h-[120px] rounded-xl
          border-2 border-neon-cyan
          bg-[rgba(0,212,255,0.05)]
          flex flex-col items-center justify-center gap-2
          cursor-pointer transition-all duration-300
          active:scale-[0.98]
        "
        style={{
          boxShadow: '0 0 30px rgba(0,212,255,0.15), inset 0 0 30px rgba(0,212,255,0.05)',
          opacity: canRecord ? 1 : 0.4,
        }}
      >
        <span
          className="text-xl font-bold tracking-[4px] text-neon-cyan"
          style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}
        >
          話し始める
        </span>
      </button>
      <p
        className="text-[11px] text-hud-white-dim tracking-wide mt-3 text-center"
        style={{ fontFamily: 'sans-serif' }}
      >
        整理されてなくて大丈夫。そのまま話してください。
      </p>
    </div>
  );
}
