'use client';

interface RecordControlsProps {
  onStop: () => void;
  isRecording: boolean;
  seconds: number;
  minSeconds?: number;
}

export default function RecordControls({
  onStop,
  isRecording,
  seconds,
  minSeconds = 30,
}: RecordControlsProps) {
  const progress = Math.min(seconds / minSeconds, 1);
  const remaining = Math.max(0, minSeconds - seconds);
  const isReady = progress >= 1;

  const ringAngle = progress * 360;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-[92px] h-[92px] rounded-full p-[2px]"
        style={{
          background: `conic-gradient(rgba(0,212,255,0.95) ${ringAngle}deg, rgba(255,59,122,0.25) ${ringAngle}deg 360deg)`,
          boxShadow: isReady
            ? '0 0 20px rgba(0,212,255,0.36), 0 0 44px rgba(255,59,122,0.28)'
            : '0 0 14px rgba(0,212,255,0.24), 0 0 24px rgba(255,59,122,0.18)',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        <button
          onClick={onStop}
          className="w-full h-full rounded-full border border-neon-magenta/60 bg-[rgba(12,16,34,0.96)] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95"
          style={{
            boxShadow: isRecording
              ? 'inset 0 0 18px rgba(255,59,122,0.3), 0 0 26px rgba(255,59,122,0.2)'
              : 'inset 0 0 10px rgba(255,59,122,0.15)',
            animation: isRecording ? 'pulse 1.2s ease infinite' : 'none',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--neon-magenta)">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      </div>

      <p
        className="text-[10px] tracking-[1.8px] uppercase"
        style={{
          color: isReady ? 'var(--neon-lime)' : 'var(--white-dim)',
          textShadow: isReady ? '0 0 12px rgba(168,255,0,0.45)' : 'none',
        }}
      >
        {isReady ? 'タップで完了' : `解析まで ${remaining}秒`}
      </p>
    </div>
  );
}
