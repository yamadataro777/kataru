'use client';

import { useRouter } from 'next/navigation';

export default function StartRecordButton() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <button
        onClick={() => router.push('/record')}
        className="
          relative w-[180px] h-[180px] rounded-full
          border-2 border-neon-cyan
          bg-[rgba(0,212,255,0.05)]
          flex flex-col items-center justify-center gap-2
          cursor-pointer transition-all duration-300
          active:scale-95
        "
        style={{
          boxShadow: '0 0 30px rgba(0,212,255,0.2), 0 0 60px rgba(0,212,255,0.1), inset 0 0 30px rgba(0,212,255,0.05)',
        }}
      >
        {/* Rotating dashed ring */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-8px',
            border: '1px dashed rgba(0,212,255,0.4)',
            borderRadius: '50%',
            animation: 'rotate-ring 20s linear infinite',
          }}
        />
        {/* Outer ring */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-16px',
            border: '1px solid rgba(0,212,255,0.08)',
            borderRadius: '50%',
            animation: 'rotate-ring 30s linear infinite reverse',
          }}
        />

        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--neon-cyan)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.5))' }}
        >
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <span
          className="text-[11px] font-bold tracking-[4px] text-neon-cyan"
          style={{ textShadow: '0 0 10px rgba(0,212,255,0.4)' }}
        >
          RECORD
        </span>
      </button>
    </div>
  );
}
