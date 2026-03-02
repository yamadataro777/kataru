'use client';

import { useRouter } from 'next/navigation';

export default function StartModeSelector() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center gap-8 py-8">
      {/* Record Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => router.push('/record')}
          className="
            relative w-[120px] h-[120px] rounded-full
            border-2 border-neon-cyan
            bg-[rgba(0,212,255,0.05)]
            flex flex-col items-center justify-center gap-1.5
            cursor-pointer transition-all duration-300
            active:scale-95
          "
          style={{
            boxShadow: '0 0 20px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.05)',
          }}
        >
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-6px',
              border: '1px dashed rgba(0,212,255,0.3)',
              borderRadius: '50%',
              animation: 'rotate-ring 20s linear infinite',
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.4))' }}
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[3px] text-neon-cyan"
            style={{ textShadow: '0 0 8px rgba(0,212,255,0.3)' }}
          >
            RECORD
          </span>
        </button>
        <span className="text-[9px] text-hud-white-dim tracking-[1px]">
          録音→AIレポート生成
        </span>
      </div>

      {/* Dialogue Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => router.push('/dialogue')}
          className="
            relative w-[120px] h-[120px] rounded-full
            border-2 border-neon-magenta
            bg-[rgba(255,59,122,0.05)]
            flex flex-col items-center justify-center gap-1.5
            cursor-pointer transition-all duration-300
            active:scale-95
          "
          style={{
            boxShadow: '0 0 20px rgba(255,59,122,0.15), inset 0 0 20px rgba(255,59,122,0.05)',
          }}
        >
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-6px',
              border: '1px dashed rgba(255,59,122,0.3)',
              borderRadius: '50%',
              animation: 'rotate-ring 20s linear infinite reverse',
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neon-magenta)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,59,122,0.4))' }}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[3px] text-neon-magenta"
            style={{ textShadow: '0 0 8px rgba(255,59,122,0.3)' }}
          >
            DIALOGUE
          </span>
        </button>
        <span className="text-[9px] text-hud-white-dim tracking-[1px]">
          AIと対話で思考を深掘り
        </span>
      </div>
    </div>
  );
}
