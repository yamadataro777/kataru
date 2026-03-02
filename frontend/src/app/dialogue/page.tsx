'use client';

import { useEffect, useCallback } from 'react';
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
    isSending,
    isEnding,
    error,
    startConversation,
    submitTurn,
    endSession,
  } = useDialogue();

  useEffect(() => {
    startConversation();
  }, [startConversation]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-xs tracking-[3px] text-neon-cyan"
            style={{ animation: 'neon-flicker 2s ease infinite' }}
          >
            INITIALIZING...
          </span>
          <span className="text-[10px] tracking-[2px] text-hud-white-dim">
            対話を準備しています
          </span>
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

      {/* Error display */}
      {error && (
        <div className="px-4 py-2">
          <p className="text-[10px] text-neon-magenta tracking-[1px] text-center">
            {error}
          </p>
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
