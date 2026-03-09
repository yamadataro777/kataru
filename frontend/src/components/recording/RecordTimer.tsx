'use client';

interface RecordTimerProps {
  seconds: number;
}

export default function RecordTimer({ seconds }: RecordTimerProps) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <div
      className="text-[20px] font-bold tracking-[4px] text-neon-cyan font-mono opacity-60"
      style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.3)' }}
    >
      {mins}:{secs}
    </div>
  );
}
