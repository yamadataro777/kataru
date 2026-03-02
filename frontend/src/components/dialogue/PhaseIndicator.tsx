'use client';

import { ConversationPhase, PHASE_ORDER, PHASE_LABELS } from '@/types/conversation';

interface PhaseIndicatorProps {
  currentPhase: ConversationPhase;
}

export default function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1">
        {PHASE_ORDER.map((phase, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={phase} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isCompleted
                      ? 'var(--neon-lime)'
                      : isCurrent
                        ? 'var(--neon-cyan)'
                        : 'rgba(232,237,245,0.2)',
                    boxShadow: isCompleted
                      ? '0 0 6px rgba(168,255,0,0.4)'
                      : isCurrent
                        ? '0 0 6px rgba(0,212,255,0.4)'
                        : 'none',
                    animation: isCurrent ? 'rec-pulse 2s ease infinite' : 'none',
                  }}
                />
                <span
                  className="text-[7px] tracking-[0.5px] mt-1 whitespace-nowrap"
                  style={{
                    color: isCompleted
                      ? 'var(--neon-lime)'
                      : isCurrent
                        ? 'var(--neon-cyan)'
                        : 'rgba(232,237,245,0.3)',
                  }}
                >
                  {PHASE_LABELS[phase]}
                </span>
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <div
                  className="h-[1px] flex-shrink-0 w-2"
                  style={{
                    background: isCompleted
                      ? 'var(--neon-lime)'
                      : 'rgba(0,212,255,0.15)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
