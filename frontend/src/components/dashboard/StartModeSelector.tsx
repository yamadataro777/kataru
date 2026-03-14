'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasFreeSessions } from '@/lib/session-tracker';

// Phase 10: Adapter shortcut definitions
const ADAPTER_SHORTCUTS = [
  { id: 'marketing', label: 'マーケ壁打ち' },
  { id: 'career', label: 'キャリア' },
  { id: 'retrospective', label: '振り返り' },
] as const;

export default function StartModeSelector() {
  const router = useRouter();
  const { profile } = useAuth();
  const [canRecord, setCanRecord] = useState(true);

  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;

  // Phase 10: Feature flag
  const showAdapterShortcuts =
    (process.env.NEXT_PUBLIC_PHASE10_ADAPTER || 'off') !== 'off';

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
      {showAdapterShortcuts && canRecord && (
        <div
          className="flex items-center gap-1 mt-2"
          style={{ fontFamily: 'sans-serif' }}
        >
          {ADAPTER_SHORTCUTS.map((adapter, i) => (
            <span key={adapter.id} className="flex items-center">
              <button
                onClick={() => router.push(`/record?adapter=${adapter.id}`)}
                className="text-[10px] tracking-wide transition-colors duration-200"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(0,212,255,0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                {adapter.label}
              </button>
              {i < ADAPTER_SHORTCUTS.length - 1 && (
                <span
                  className="text-[10px] mx-1"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  ・
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
