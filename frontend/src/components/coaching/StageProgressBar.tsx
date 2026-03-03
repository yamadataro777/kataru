'use client';

import type { CoachingStage, StageMode } from '../../types/coaching';

interface StageProgressBarProps {
  currentStage: CoachingStage;
  stageMode: StageMode | null;
  completedStages: CoachingStage[];
}

const STAGE_LABELS: Record<CoachingStage, string> = {
  1: '整理',
  2: '目標設定',
  3: '行動設定',
  4: '確定',
};

export function StageProgressBar({ currentStage, stageMode, completedStages }: StageProgressBarProps) {
  const stages: CoachingStage[] = [1, 2, 3, 4];

  function getLabel(stage: CoachingStage): string {
    if (stage === 1 && stageMode === 'logical') return '整理（論理）';
    if (stage === 1 && stageMode === 'emotional') return '整理（感情）';
    return STAGE_LABELS[stage];
  }

  function getStageStatus(stage: CoachingStage): 'completed' | 'current' | 'pending' {
    if (completedStages.includes(stage)) return 'completed';
    if (stage === currentStage) return 'current';
    return 'pending';
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 w-full">
      {stages.map((stage, idx) => {
        const status = getStageStatus(stage);
        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300',
                  status === 'completed'
                    ? 'bg-[#A8FF00] text-black'
                    : status === 'current'
                      ? 'bg-[#00D4FF] text-black animate-pulse'
                      : 'bg-gray-700 text-gray-500',
                ].join(' ')}
                style={status === 'current' ? { boxShadow: '0 0 12px #00D4FF' } : undefined}
              >
                {status === 'completed' ? '✓' : stage}
              </div>
              {/* Label */}
              <span
                className={[
                  'mt-1 text-[9px] font-mono text-center leading-tight max-w-[60px]',
                  status === 'completed'
                    ? 'text-[#A8FF00]'
                    : status === 'current'
                      ? 'text-[#00D4FF]'
                      : 'text-gray-600',
                ].join(' ')}
              >
                {getLabel(stage)}
              </span>
            </div>
            {/* Connector line (not after last) */}
            {idx < stages.length - 1 && (
              <div
                className={[
                  'flex-1 h-[1px] mx-1 mb-4',
                  completedStages.includes(stage)
                    ? 'bg-[#A8FF00]'
                    : stage === currentStage
                      ? 'bg-[#00D4FF] opacity-50'
                      : 'bg-gray-700',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
