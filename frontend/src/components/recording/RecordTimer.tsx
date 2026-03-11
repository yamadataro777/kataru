'use client';

interface RecordTimerProps {
  seconds: number;
  minSeconds?: number;
}

export default function RecordTimer({ seconds, minSeconds = 30 }: RecordTimerProps) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  const phase = seconds < minSeconds ? 'WARM UP' : seconds < 90 ? 'FLOW' : 'DEEP';
  const phaseColor = seconds < minSeconds
    ? 'var(--neon-magenta)'
    : seconds < 90
      ? 'var(--neon-cyan)'
      : 'var(--neon-lime)';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-[24px] font-bold tracking-[4px] text-neon-cyan font-mono"
        style={{ textShadow: '0 0 14px rgba(0, 212, 255, 0.45)' }}
      >
        {mins}:{secs}
      </div>

      <div className="flex items-center gap-2 text-[9px] tracking-[2px] uppercase">
        <span style={{ color: phaseColor }}>{phase}</span>
        <span className="text-hud-white-dim">
          {seconds < minSeconds ? `${minSeconds - seconds}秒で解析アンロック` : '解析アンロック済み'}
        </span>
      </div>
    </div>
  );
}
