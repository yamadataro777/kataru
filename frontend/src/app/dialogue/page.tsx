'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachingDialogue } from '@/hooks/useCoachingDialogue';
import { StageProgressBar } from '@/components/coaching/StageProgressBar';
import { ModeSelector } from '@/components/coaching/ModeSelector';
import { ModeSwitchSuggestionBanner } from '@/components/coaching/ModeSwitchSuggestionBanner';
import { AdvanceStageButton } from '@/components/coaching/AdvanceStageButton';
import { CoachingConversationThread } from '@/components/coaching/CoachingConversationThread';
import { CoachingRecordButton } from '@/components/coaching/CoachingRecordButton';
import { getSessionPhase } from '@/lib/session-tracker';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import type { CoachingStage } from '@/types/coaching';

export default function DialoguePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;
  const isPreview = plan !== 'standard' && getSessionPhase(freeSessionsUsed) === 'dialogue_preview';
  const [showPreviewEnd, setShowPreviewEnd] = useState(false);
  const {
    conversationId,
    currentStage,
    stageMode,
    turns,
    canAdvance,
    missingRequirements,
    modeSwitchSuggestion,
    uiState,
    error,
    isWaking,
    wakingProgress,
    stageSummaries,
    initializeSession,
    selectMode,
    submitTurn,
    advanceStage,
    acceptModeSwitchSuggestion,
    declineModeSwitchSuggestion,
    endSession,
    retryTurn,
  } = useCoachingDialogue();

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When SESSION_COMPLETE, end session and navigate to results
  useEffect(() => {
    if (uiState === 'SESSION_COMPLETE') {
      endSession();
    }
  }, [uiState, endSession]);

  // In preview mode, show end modal when stage 2 is done and user tries to advance
  useEffect(() => {
    if (isPreview && currentStage > 2 && !showPreviewEnd) {
      setShowPreviewEnd(true);
    }
  }, [isPreview, currentStage, showPreviewEnd]);

  const handleRecordingComplete = useCallback(
    (blob: Blob, transcript: string) => {
      submitTurn(blob, transcript || undefined);
    },
    [submitTurn]
  );

  // Determine which stages are completed
  const completedStages: CoachingStage[] = (
    [1, 2, 3, 4] as CoachingStage[]
  ).filter((s) => s < currentStage && stageSummaries[String(s)]);

  const isProcessing = uiState === 'PROCESSING';

  // ─── Server waking state ──────────────────────────────────────────────────
  if (isWaking) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4 px-6 max-w-xs">
          <span
            className="text-xs tracking-[3px] text-[#00D4FF] font-mono"
            style={{ animation: 'neon-flicker 2s ease infinite' }}
          >
            サーバー起動中...
          </span>
          <div
            className="w-48 h-[2px] rounded-full overflow-hidden"
            style={{ background: 'rgba(0,212,255,0.15)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${wakingProgress}%`,
                background: '#00D4FF',
                boxShadow: '0 0 8px #00D4FF',
              }}
            />
          </div>
          <span className="text-[10px] tracking-[1px] text-gray-500 font-mono text-center leading-relaxed">
            サーバーがスリープ状態から復帰中です。
            <br />
            通常30〜60秒かかります。
          </span>
        </div>
      </div>
    );
  }

  // ─── Full-screen error (before session created) ───────────────────────────
  if (error && !conversationId) {
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
            <span className="text-[#FF3B7A] text-lg font-mono">!</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[2px] text-[#FF3B7A] font-mono">接続エラー</span>
            <p className="text-[10px] leading-relaxed text-gray-500 font-mono">{error}</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => initializeSession()}
              className="text-[10px] tracking-[2px] px-6 py-2.5 rounded cursor-pointer transition-all font-mono"
              style={{
                border: '1px solid rgba(0,212,255,0.4)',
                background: 'rgba(0,212,255,0.08)',
                color: '#00D4FF',
              }}
            >
              再試行
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-[10px] tracking-[2px] px-6 py-2 rounded cursor-pointer transition-all bg-transparent font-mono"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(232,237,245,0.5)',
              }}
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Initial loading (PROCESSING before mode select) ─────────────────────
  if (uiState === 'PROCESSING' && !conversationId) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-4 px-6 max-w-xs">
          <span
            className="text-xs tracking-[3px] text-[#00D4FF] font-mono"
            style={{ animation: 'neon-flicker 2s ease infinite' }}
          >
            INITIALIZING...
          </span>
          <span className="text-[10px] tracking-[2px] text-gray-500 font-mono">
            セッションを準備しています
          </span>
        </div>
      </div>
    );
  }

  // ─── Mode selection screen ────────────────────────────────────────────────
  if (uiState === 'MODE_SELECT') {
    return (
      <div className="flex flex-col min-h-dvh">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/')}
              className="text-[9px] tracking-[2px] text-[#00D4FF] bg-transparent border-0 cursor-pointer flex items-center gap-1 font-mono"
            >
              <span>&larr;</span> BACK
            </button>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#00D4FF',
                  boxShadow: '0 0 6px #00D4FF',
                  animation: 'rec-pulse 2s ease infinite',
                }}
              />
              <span className="text-[9px] tracking-[2px] text-[#00D4FF] font-mono">COACHING</span>
            </div>
          </div>
          <div className="h-[1px]" style={{ background: 'rgba(0,212,255,0.15)' }} />
        </div>

        {/* Mode selector */}
        <div className="flex-1 flex items-center justify-center">
          <ModeSelector
            onSelectMode={selectMode}
            selectedMode={stageMode}
            isLoading={isProcessing}
          />
        </div>

        {/* Error inline */}
        {error && (
          <div className="px-4 pb-4 text-center">
            <p className="text-[10px] text-[#FF3B7A] tracking-[1px] font-mono">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Main coaching UI ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/')}
            className="text-[9px] tracking-[2px] text-[#00D4FF] bg-transparent border-0 cursor-pointer flex items-center gap-1 font-mono"
          >
            <span>&larr;</span> BACK
          </button>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#FF3B7A',
                boxShadow: '0 0 6px #FF3B7A',
                animation: 'rec-pulse 2s ease infinite',
              }}
            />
            <span className="text-[9px] tracking-[2px] text-[#FF3B7A] font-mono">
              STAGE {currentStage} / 4
            </span>
          </div>
        </div>

        {/* 4-stage progress bar */}
        <StageProgressBar
          currentStage={currentStage}
          stageMode={stageMode}
          completedStages={completedStages}
        />

        <div className="h-[1px]" style={{ background: 'rgba(0,212,255,0.15)' }} />
      </div>

      {/* Conversation thread */}
      <CoachingConversationThread
        turns={turns}
        isProcessing={isProcessing}
        currentStage={currentStage}
      />

      {/* Mode switch suggestion banner */}
      <ModeSwitchSuggestionBanner
        visible={modeSwitchSuggestion.visible}
        suggestedMode={modeSwitchSuggestion.suggestedMode}
        reason={modeSwitchSuggestion.reason}
        onAccept={acceptModeSwitchSuggestion}
        onDecline={declineModeSwitchSuggestion}
      />

      {/* Inline error display (mid-conversation) */}
      {error && conversationId && (
        <div className="px-4 py-2 flex flex-col items-center gap-2">
          <p className="text-[10px] text-[#FF3B7A] tracking-[1px] text-center font-mono">
            {error}
          </p>
          <button
            onClick={retryTurn}
            className="text-[9px] tracking-[2px] px-4 py-1.5 rounded cursor-pointer transition-all font-mono"
            style={{
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.06)',
              color: '#00D4FF',
            }}
          >
            再試行
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}
      >
        {/* Advance stage button */}
        {(uiState === 'RECORDING' || uiState === 'PROCESSING') && (
          <AdvanceStageButton
            canAdvance={canAdvance}
            currentStage={currentStage}
            missingRequirements={missingRequirements}
            onAdvance={advanceStage}
            disabled={isProcessing}
          />
        )}

        {/* Record button */}
        <CoachingRecordButton
          onRecordingComplete={handleRecordingComplete}
          disabled={isProcessing || showPreviewEnd}
          stageMode={stageMode}
        />
      </div>

      {/* Preview End Modal */}
      {showPreviewEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,26,0.9)]">
          <GlassCard className="mx-5 max-w-sm p-6" variant="lime">
            <h3
              className="text-sm font-bold tracking-[2px] mb-3"
              style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
            >
              対話モード プレビュー完了
            </h3>
            <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-4">
              ここまでが無料体験です。Standard プランにアップグレードすると、
              4ステージ全てのコーチングを体験できます。
            </p>
            <div className="flex flex-col gap-3">
              <NeonButton variant="lime" onClick={() => router.push('/pricing')} className="w-full">
                プランを見る
              </NeonButton>
              <button
                onClick={() => router.push('/')}
                className="w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
              >
                ホームに戻る
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
