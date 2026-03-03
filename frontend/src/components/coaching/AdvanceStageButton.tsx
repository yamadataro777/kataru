'use client';

import { useState } from 'react';
import type { CoachingStage } from '../../types/coaching';

interface AdvanceStageButtonProps {
  canAdvance: boolean;
  currentStage: CoachingStage;
  missingRequirements: string[];
  onAdvance: () => void;
  disabled?: boolean;
}

export function AdvanceStageButton({
  canAdvance,
  currentStage,
  missingRequirements,
  onAdvance,
  disabled,
}: AdvanceStageButtonProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isLastStage = currentStage === 4;
  const label = isLastStage ? 'セッションを完了する' : '次のセクションへ';

  function handleClick() {
    if (!canAdvance || disabled) {
      const msg = missingRequirements[0] ?? 'まだ整理を続けましょう';
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    onAdvance();
  }

  return (
    <div className="px-4 pb-2 relative">
      {toastMessage && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-[#FF3B7A]/10 border border-[#FF3B7A]/40 rounded p-2 font-mono text-xs text-[#FF3B7A] text-center">
          {toastMessage}
        </div>
      )}
      <button
        onClick={handleClick}
        className={[
          'w-full py-3 rounded-lg font-mono text-sm font-bold tracking-wider transition-all duration-200',
          canAdvance && !disabled
            ? 'bg-[#00D4FF]/10 border border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/20 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
            : 'bg-transparent border border-gray-700 text-gray-600 cursor-default',
        ].join(' ')}
      >
        {label}
        {canAdvance && !disabled && <span className="ml-2">→</span>}
      </button>
    </div>
  );
}
