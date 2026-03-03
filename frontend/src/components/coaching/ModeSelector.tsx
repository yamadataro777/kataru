'use client';

import type { StageMode } from '../../types/coaching';

interface ModeSelectorProps {
  onSelectMode: (mode: StageMode) => void;
  selectedMode: StageMode | null;
  isLoading?: boolean;
}

export function ModeSelector({ onSelectMode, selectedMode, isLoading }: ModeSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 w-full">
      <div className="text-center">
        <h2 className="text-[#00D4FF] font-mono text-base font-bold tracking-wider mb-1">
          整理モードを選択
        </h2>
        <p className="text-gray-500 font-mono text-xs">
          今日のセッションはどちらに近いですか？
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[320px]">
        {/* Logical */}
        <button
          onClick={() => !isLoading && onSelectMode('logical')}
          disabled={isLoading}
          className={[
            'relative flex flex-col items-start p-4 rounded-lg border font-mono transition-all duration-200 text-left',
            selectedMode === 'logical'
              ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-[0_0_20px_rgba(0,212,255,0.2)]'
              : 'border-[#00D4FF]/30 bg-[#0A0E1A] hover:border-[#00D4FF]/60',
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#00D4FF] text-lg">⬡</span>
            <span className="text-[#00D4FF] text-sm font-bold tracking-wider">論理整理</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            問題の構造・制約・優先順位を整理
          </p>
          <p className="text-gray-600 text-[10px] mt-1">
            「何を決めるべきか」が明確でない
          </p>
        </button>

        {/* Emotional */}
        <button
          onClick={() => !isLoading && onSelectMode('emotional')}
          disabled={isLoading}
          className={[
            'relative flex flex-col items-start p-4 rounded-lg border font-mono transition-all duration-200 text-left',
            selectedMode === 'emotional'
              ? 'border-[#FF3B7A] bg-[#FF3B7A]/10 shadow-[0_0_20px_rgba(255,59,122,0.2)]'
              : 'border-[#FF3B7A]/30 bg-[#0A0E1A] hover:border-[#FF3B7A]/60',
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#FF3B7A] text-lg">◎</span>
            <span className="text-[#FF3B7A] text-sm font-bold tracking-wider">感情整理</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            感情・気持ち・内的な引っかかりを整理
          </p>
          <p className="text-gray-600 text-[10px] mt-1">
            「モヤモヤしているが言葉にできない」
          </p>
        </button>
      </div>
    </div>
  );
}
