'use client';

import GlassCard from '@/components/ui/GlassCard';
import { PendingAction } from '@/lib/api';

interface PendingActionsProps {
  actions: PendingAction[];
  isPaid: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PendingActions({ actions, isPaid }: PendingActionsProps) {
  const displayActions = actions.slice(0, 5);
  const count = actions.length;

  return (
    <GlassCard className="p-4" variant="magenta">
      <span className="label label-magenta mb-1 block">PENDING ACTIONS</span>
      <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
        放置中のアクション
      </span>

      {count === 0 ? (
        <p className="text-[12px] text-hud-white-dim" style={{ fontFamily: 'sans-serif' }}>
          {isPaid
            ? 'セッションで具体的な行動を宣言すると、ここに表示されます'
            : 'Standardプランでアクション追跡が利用できます'}
        </p>
      ) : isPaid ? (
        <div className="flex flex-col gap-2">
          {displayActions.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-neon-magenta text-[11px] mt-0.5 shrink-0">▸</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] text-hud-white leading-snug truncate"
                  style={{ fontFamily: 'sans-serif', opacity: 0.9 }}
                >
                  {a.action}
                </p>
              </div>
              <span className="text-[10px] text-hud-white-dim tracking-[1px] shrink-0 tabular-nums">
                {formatDate(a.sessionDate)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* Free user: blurred content + CTA */
        <div className="relative">
          <div className="flex flex-col gap-2" style={{ filter: 'blur(4px)' }}>
            {displayActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-neon-magenta text-[11px] mt-0.5">▸</span>
                <p className="text-[12px] text-hud-white" style={{ fontFamily: 'sans-serif', opacity: 0.9 }}>
                  {a.action}
                </p>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[11px] tracking-[1px] text-neon-magenta font-bold"
              style={{ fontFamily: 'sans-serif' }}
            >
              {count}件のアクションが提案されています
            </span>
            <span
              className="mt-2 text-[10px] tracking-[2px] text-neon-magenta opacity-70"
            >
              Standardプランでアクション追跡 →
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
