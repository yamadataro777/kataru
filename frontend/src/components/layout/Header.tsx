'use client';

export default function Header() {
  return (
    <header className="flex justify-between items-center px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1
          className="text-xl font-black tracking-[6px] text-neon-cyan"
          style={{ textShadow: '0 0 20px rgba(0,212,255,0.5)' }}
        >
          KATARU
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-neon-lime"
            style={{
              boxShadow: '0 0 6px #A8FF00',
              animation: 'rec-pulse 2s ease infinite',
            }}
          />
          <span className="text-[9px] tracking-[2px] uppercase text-neon-lime opacity-70">
            ONLINE
          </span>
        </div>
        <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-50">
          v1.0
        </span>
      </div>
    </header>
  );
}
