'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import useDialogue from '@/hooks/useDialogue';
import PhaseIndicator from '@/components/dialogue/PhaseIndicator';
import ConversationThread from '@/components/dialogue/ConversationThread';
import DialogueRecordButton from '@/components/dialogue/DialogueRecordButton';
import TurnProcessing from '@/components/dialogue/TurnProcessing';

export default function DialoguePage() {
  const router = useRouter();
  const {
    conversation,
    turns,
    phase,
    isLoading,
    isWaking,
    wakingProgress,
    isSending,
    isEnding,
    error,
    startConversation,
    retryStart,
    retryTurn,
    submitTurn,
    endSession,
  } = useDialogue();

  const [slowLoading, setSlowLoading] = useState(false);

  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Show "taking longer than expected" after 10s if still loading but not in waking mode
  useEffect(() => {
    if (!isLoading || isWaking) {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoading(true), 10_000);
    return () => clearTimeout(timer);
  }, [isLoading, isWaking]);

  const handleRecordingComplete = useCallback(
    (blob: Blob, transcript: string) => {
      submitTurn(blob, transcript || undefined);
    },
    [submitTurn]
  );

  const handleEnd = useCallback(async () => {
    await endSession();
    if (conversation) {
      router.push(`/dialogue/results?id=${conversation.id}`);
    }
  }, [endSession, conversation, router]);

  // Auto-end when close phase is reached
  useEffect(() => {
    if (phase === 'close' && conversation && conversation.status !== 'ended') {
      handleEnd();
    }
  }, [phase, conversation, handleEnd]);

  // Full-screen error state (no conversation yet)
  if (error && !conversation) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-6">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              border: '1px solid rgba(255,59,122,0.4)',
              background: 'rgba(255,59,122,0.08)',
            }}
          >
            <span className="text-neon-magenta text-lg">!</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[2px] text-neon-magenta">
              接続エラー
            </span>
            <p className="text-[10px] leading-relaxed text-hud-white-dim">
              {error}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={retryStart}
              className="text-[10px] tracking-[2px] px-6 py-2.5 rounded cursor-pointer transition-all"
              style={{
                border: '1px solid rgba(0,212,255,0.4)',
                background: 'rgba(0,212,255,0.08)',
                color: 'var(--neon-cyan)',
              }}
            >
              再試行
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-[10px] tracking-[2px] px-6 py-2 rounded cursor-pointer transition-all bg-transparent"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--hud-white-dim)',
              }}
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state with waking / slow loading support
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4 px-6 max-w-xs">
          {isWaking ? (
            <>
              <span
                className="text-xs tracking-[3px] text-neon-cyan"
                style={{ animation: 'neon-flicker 2s ease infinite' }}
              >
                サーバー起動中...
              </span>
              {/* Progress bar */}
              <div
                className="w-48 h-[2px] rounded-full overflow-hidden"
                style={{ background: 'rgba(0,212,255,0.15)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${wakingProgress}%`,
                    background: 'var(--neon-cyan)',
                    boxShadow: '0 0 8px var(--neon-cyan)',
                  }}
                />
              </div>
              <span className="text-[10px] tracking-[1px] text-hud-white-dim text-center leading-relaxed">
                サーバーがスリープ状態から復帰中です。
                <br />
                通常30〜60秒かかります。
              </span>
            </>
          ) : (
            <>
              <span
                className="text-xs tracking-[3px] text-neon-cyan"
                style={{ animation: 'neon-flicker 2s ease infinite' }}
              >
                INITIALIZING...
              </span>
              <span className="text-[10px] tracking-[2px] text-hud-white-dim">
                {slowLoading
                  ? '予想より時間がかかっています...'
                  : '対話を準備しています'}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/')}
            className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
          >
            <span>&larr;</span> BACK
          </button>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 6px var(--neon-magenta)',
                animation: 'rec-pulse 2s ease infinite',
              }}
            />
            <span className="text-[9px] tracking-[2px] text-neon-magenta">
              DIALOGUE
            </span>
          </div>
        </div>
        <PhaseIndicator currentPhase={phase} />
        <div
          className="h-[1px] mt-1"
          style={{ background: 'rgba(0,212,255,0.15)' }}
        />
      </div>

      {/* Conversation Thread */}
      <ConversationThread turns={turns} />

      {/* Processing indicator */}
      <TurnProcessing isVisible={isSending} />

      {/* Inline error display (mid-conversation) */}
      {error && (
        <div className="px-4 py-2 flex flex-col items-center gap-2">
          <p className="text-[10px] text-neon-magenta tracking-[1px] text-center">
            {error}
          </p>
          <button
            onClick={retryTurn}
            className="text-[9px] tracking-[2px] px-4 py-1.5 rounded cursor-pointer transition-all"
            style={{
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.06)',
              color: 'var(--neon-cyan)',
            }}
          >
            再試行
          </button>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex-shrink-0 border-t border-[rgba(0,212,255,0.1)]">
        <DialogueRecordButton
          onRecordingComplete={handleRecordingComplete}
          disabled={isSending || isEnding}
        />

        {conversation && conversation.turn_count >= 5 && (
          <div className="flex justify-center pb-4 px-4">
            <button
              onClick={handleEnd}
              disabled={isEnding}
              className="text-[10px] tracking-[2px] px-6 py-2 rounded border cursor-pointer transition-all bg-transparent"
              style={{
                borderColor: 'rgba(255,59,122,0.4)',
                color: 'var(--neon-magenta)',
                opacity: isEnding ? 0.5 : 1,
              }}
            >
              {isEnding ? 'レポート生成中...' : 'セッションを終了'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
