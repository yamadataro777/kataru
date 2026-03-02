'use client';

import GlassCard from '@/components/ui/GlassCard';

interface UsageCardProps {
  used: number;
  limit: number;
  isPaid: boolean;
}

export default function UsageCard({ used, limit, isPaid }: UsageCardProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 100 ? 'var(--neon-magenta)' : pct >= 70 ? '#FFB800' : 'var(--neon-cyan)';

  return (
    <GlassCard className="p-4">
      <span className="label mb-1 block">USAGE</span>
      <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
        利用状況
      </span>

      <div className="flex items-baseline gap-1 mb-2">
        <span
          className="text-2xl font-bold tracking-[2px]"
          style={{ color: barColor, textShadow: `0 0 10px ${barColor}44` }}
        >
          {used}
        </span>
        <span className="text-[12px] text-hud-white-dim">/{limit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
            boxShadow: `0 0 8px ${barColor}44`,
          }}
        />
      </div>

      <span className="text-[10px] text-hud-white-dim tracking-[1px]" style={{ fontFamily: 'sans-serif' }}>
        {isPaid ? '月間セッション' : '無料セッション'}
      </span>

      {!isPaid && (
        <div className="mt-3 pt-3 border-t border-glass-border">
          <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-70">
            Standardにアップグレード →
          </span>
        </div>
      )}
    </GlassCard>
  );
}
