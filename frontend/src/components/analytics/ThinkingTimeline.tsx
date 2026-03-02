'use client';

import GlassCard from '@/components/ui/GlassCard';
import { RecentSessionSummary } from '@/lib/api';

interface ThinkingTimelineProps {
  sessions: RecentSessionSummary[];
  isPaid: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

export default function ThinkingTimeline({ sessions, isPaid }: ThinkingTimelineProps) {
  const freeLimit = 3;
  const visibleSessions = isPaid ? sessions : sessions.slice(0, freeLimit);
  const hiddenCount = isPaid ? 0 : Math.max(0, sessions.length - freeLimit);

  return (
    <GlassCard className="p-4">
      <span className="label mb-1 block">THINKING TIMELINE</span>
      <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
        思考の軌跡
      </span>

      {sessions.length === 0 ? (
        <p className="text-[12px] text-hud-white-dim" style={{ fontFamily: 'sans-serif' }}>
          セッションを録音すると、思考の軌跡が表示されます
        </p>
      ) : (
        <div className="relative pl-4">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[5px] top-[6px] w-[1px]"
            style={{
              height: 'calc(100% - 12px)',
              background: 'linear-gradient(180deg, var(--neon-cyan), transparent)',
              opacity: 0.3,
            }}
          />

          <div className="flex flex-col gap-4">
            {visibleSessions.map((s, i) => (
              <div key={s.id} className="relative">
                {/* Timeline dot */}
                <div
                  className="absolute -left-4 top-[5px] w-[10px] h-[10px] rounded-full border-2"
                  style={{
                    borderColor: i === 0 ? 'var(--neon-cyan)' : 'rgba(0,212,255,0.3)',
                    background: i === 0 ? 'var(--neon-cyan)' : 'transparent',
                    boxShadow: i === 0 ? '0 0 8px rgba(0,212,255,0.5)' : 'none',
                  }}
                />
                <div>
                  <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-60">
                    {formatDate(s.createdAt)}
                  </span>
                  <p
                    className="text-[12px] text-hud-white mt-0.5 leading-snug"
                    style={{ fontFamily: 'sans-serif', opacity: 0.9 }}
                  >
                    {s.title || 'Untitled'}
                  </p>
                  {s.summary && (
                    <p
                      className="text-[11px] text-hud-white-dim mt-0.5 leading-snug"
                      style={{ fontFamily: 'sans-serif' }}
                    >
                      {truncate(s.summary, 50)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Free user CTA */}
          {!isPaid && hiddenCount > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-glass-border text-center">
              <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-60">
                Standardで全履歴を表示 →
              </span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
