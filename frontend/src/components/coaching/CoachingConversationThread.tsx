'use client';

import { useEffect, useRef } from 'react';
import type { CoachingTurn, CoachingStage } from '../../types/coaching';

interface CoachingConversationThreadProps {
  turns: CoachingTurn[];
  isProcessing: boolean;
  currentStage: CoachingStage;
}

const STAGE_LABELS: Record<number, string> = {
  1: '整理',
  2: '目標設定',
  3: '行動設定',
  4: '確定',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function CoachingConversationThread({
  turns,
  isProcessing,
  currentStage,
}: CoachingConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isProcessing]);

  // Group turns by stage for separators
  let lastStage: number | null = null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
      {turns.map((turn, idx) => {
        const showStageSeparator =
          turn.current_stage !== lastStage && turn.user_transcript === null && idx > 0;
        lastStage = turn.current_stage;

        return (
          <div key={turn.id}>
            {/* Stage separator */}
            {showStageSeparator && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-[1px] bg-[#00D4FF]/20" />
                <span className="text-[#00D4FF]/60 font-mono text-[10px] tracking-widest uppercase">
                  STAGE {turn.current_stage} — {STAGE_LABELS[turn.current_stage] || ''}
                </span>
                <div className="flex-1 h-[1px] bg-[#00D4FF]/20" />
              </div>
            )}

            {/* User message */}
            {turn.user_transcript && (
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div
                    className="rounded-lg px-3 py-2 font-mono text-sm text-[#00D4FF] leading-relaxed"
                    style={{
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.2)',
                    }}
                  >
                    {turn.user_transcript}
                  </div>
                  <div className="text-right text-[10px] text-gray-600 mt-1 font-mono">
                    {formatTime(turn.created_at)}
                  </div>
                </div>
              </div>
            )}

            {/* AI message */}
            {turn.ai_response && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-[10px] text-gray-600 font-mono mb-1 tracking-wider">
                    AI COACH · STAGE {turn.current_stage}
                  </div>
                  <div
                    className="rounded-lg px-3 py-2 font-mono text-sm text-[#FF3B7A] leading-relaxed"
                    style={{
                      background: 'rgba(255,59,122,0.06)',
                      border: '1px solid rgba(255,59,122,0.2)',
                    }}
                  >
                    {turn.ai_response}
                  </div>
                  <div className="text-left text-[10px] text-gray-600 mt-1 font-mono">
                    {formatTime(turn.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="text-[10px] text-gray-600 font-mono mb-1 tracking-wider">
              AI COACH · 分析中...
            </div>
            <div
              className="rounded-lg px-3 py-2 font-mono text-sm"
              style={{
                background: 'rgba(255,59,122,0.06)',
                border: '1px solid rgba(255,59,122,0.2)',
              }}
            >
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#FF3B7A]"
                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
