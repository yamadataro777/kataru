'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { togglePlan } from '@/lib/api';

export default function Header() {
  const { refreshProfile } = useAuth();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleVersionTap = useCallback(async () => {
    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      try {
        await togglePlan();
        await refreshProfile();
      } catch {
        // silently fail
      }
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  }, [refreshProfile]);

  return (
    <header className="flex justify-between items-center px-5 py-2 flex-shrink-0" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-black tracking-[5px] text-neon-cyan"
          style={{ textShadow: '0 0 20px rgba(0,212,255,0.5)' }}
        >
          KATARU
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-[8px] tracking-[1px] text-hud-white-dim opacity-40 cursor-default select-none"
          onClick={handleVersionTap}
        >
          v0.1.0
        </span>
        <Link
          href="/settings"
          className="flex items-center justify-center w-6 h-6 rounded-md border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] hover:bg-[rgba(0,212,255,0.1)] transition-colors"
          aria-label="設定"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(0,212,255,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
