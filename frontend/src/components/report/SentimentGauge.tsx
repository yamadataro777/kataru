'use client';

import GlassCard from '@/components/ui/GlassCard';

interface SentimentGaugeProps {
  overall: string;
  score: number;
  details: string;
}

export default function SentimentGauge({ overall, score, details }: SentimentGaugeProps) {
  // score is 0..1, map to gauge
  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (score >= 0.7) return { color: 'var(--neon-lime)', glow: 'rgba(168,255,0,0.3)' };
    if (score >= 0.4) return { color: 'var(--neon-cyan)', glow: 'rgba(0,212,255,0.3)' };
    return { color: 'var(--neon-magenta)', glow: 'rgba(255,59,122,0.3)' };
  };

  const { color, glow } = getColor();

  return (
    <GlassCard className="p-4">
      <h3
        className="text-xs font-bold tracking-[3px] uppercase text-neon-cyan mb-4"
        style={{ textShadow: '0 0 10px rgba(0,212,255,0.3)' }}
      >
        SENTIMENT ANALYSIS
      </h3>
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="rgba(0,212,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${percentage} ${100 - percentage}`}
              style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{ color, textShadow: `0 0 8px ${glow}` }}
          >
            {percentage}
          </span>
        </div>
        <div>
          <div className="text-sm font-bold tracking-[2px] uppercase" style={{ color }}>
            {overall}
          </div>
          <p className="text-xs text-hud-white-dim mt-1 leading-5 tracking-wide">
            {details}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
