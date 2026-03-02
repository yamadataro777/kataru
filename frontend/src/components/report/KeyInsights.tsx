'use client';

import GlassCard from '@/components/ui/GlassCard';

interface KeyInsightsProps {
  insights: string[];
}

export default function KeyInsights({ insights }: KeyInsightsProps) {
  return (
    <GlassCard className="p-4" variant="cyan" hudCorners>
      <h3
        className="text-xs font-bold tracking-[3px] uppercase text-neon-cyan mb-4"
        style={{ textShadow: '0 0 10px rgba(0,212,255,0.3)' }}
      >
        KEY INSIGHTS
      </h3>
      <div className="flex flex-col gap-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span
              className="text-xs font-bold text-neon-cyan flex-shrink-0 w-6 h-6 flex items-center justify-center rounded border border-[rgba(0,212,255,0.3)]"
              style={{ textShadow: '0 0 8px rgba(0,212,255,0.4)' }}
            >
              {(i + 1).toString().padStart(2, '0')}
            </span>
            <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
              {insight}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
