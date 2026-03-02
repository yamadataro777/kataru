'use client';

interface RecordTimerProps {
  seconds: number;
}

export default function RecordTimer({ seconds }: RecordTimerProps) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <div
      className="text-[28px] font-bold tracking-[4px] text-neon-cyan font-mono"
      style={{ textShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
    >
      {mins}:{secs}
    </div>
  );
}
