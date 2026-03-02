'use client';

interface TurnProcessingProps {
  isVisible: boolean;
}

export default function TurnProcessing({ isVisible }: TurnProcessingProps) {
  if (!isVisible) return null;

  return (
    <div
      className="flex items-center justify-center gap-3 py-3 px-4"
      style={{
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--neon-magenta)',
              boxShadow: '0 0 6px rgba(255,59,122,0.4)',
              animation: `rec-pulse 1.2s ease infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span
        className="text-[10px] tracking-[2px] text-neon-magenta"
        style={{ textShadow: '0 0 8px rgba(255,59,122,0.3)' }}
      >
        分析中...
      </span>
    </div>
  );
}
