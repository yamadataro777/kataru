'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CoachingDialogueState,
  CoachingTurn,
  CoachingTurnResponse,
  CoachingStage,
  StageMode,
  StageExtractedData,
} from '../types/coaching';
import { canAdvanceFromStage, parseLLMResponse } from '../types/coaching';
import { coachingApi } from '../lib/coachingApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const INITIAL_STATE: CoachingDialogueState = {
  conversationId: null,
  currentStage: 1,
  stageMode: null,
  turns: [],
  lastLLMResponse: null,
  canAdvance: false,
  missingRequirements: [],
  stageSummaries: {},
  extractedData: {},
  modeSwitchSuggestion: { visible: false, suggestedMode: null, reason: null },
  uiState: 'MODE_SELECT',
  error: null,
  isWaking: false,
  wakingProgress: 0,
};

export function useCoachingDialogue() {
  const [state, setState] = useState<CoachingDialogueState>(INITIAL_STATE);
  const router = useRouter();
  const lastTurnRef = useRef<{ audioBlob?: Blob; transcript?: string } | null>(null);

  // Check server health
  async function checkHealth(signal: AbortSignal): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/health`, { signal, cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Ensure server is awake
  async function ensureServerAwake(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const ok = await checkHealth(controller.signal);
      clearTimeout(timeout);
      if (ok) return true;
    } catch {}

    // Server not responding, poll
    setState((prev) => ({ ...prev, isWaking: true, wakingProgress: 0 }));
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      setState((prev) => ({ ...prev, wakingProgress: Math.min(95, (i + 1) * 5) }));
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const ok = await checkHealth(controller.signal);
        clearTimeout(timeout);
        if (ok) {
          setState((prev) => ({ ...prev, isWaking: false, wakingProgress: 100 }));
          return true;
        }
      } catch {}
    }
    setState((prev) => ({ ...prev, isWaking: false }));
    return false;
  }

  // Initialize session (call on mount)
  const initializeSession = useCallback(async () => {
    setState((prev) => ({ ...prev, uiState: 'PROCESSING', error: null }));
    try {
      const ok = await ensureServerAwake();
      if (!ok) {
        setState((prev) => ({
          ...prev,
          uiState: 'MODE_SELECT',
          error: 'サーバーに接続できません。しばらくしてから再試行してください。',
        }));
        return;
      }
      const conversation = await coachingApi.createSession();
      setState((prev) => ({
        ...prev,
        conversationId: conversation.id,
        uiState: 'MODE_SELECT',
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        uiState: 'MODE_SELECT',
        error: 'セッションの開始に失敗しました。再試行してください。',
      }));
    }
  }, []);

  // Select mode (logical or emotional)
  const selectMode = useCallback(
    async (mode: StageMode) => {
      if (!state.conversationId) return;
      setState((prev) => ({ ...prev, stageMode: mode, uiState: 'PROCESSING', error: null }));
      try {
        const initialResponse = await coachingApi.getInitialMessage(state.conversationId, 1, mode);
        const parsed = parseLLMResponse(initialResponse, 1, mode);
        const aiTurn: CoachingTurn = {
          id: `initial-${Date.now()}`,
          conversation_id: state.conversationId,
          turn_number: 0,
          user_transcript: null,
          audio_url: null,
          ai_response: parsed.assistant_message,
          current_stage: 1,
          stage_mode: mode,
          coaching_response: parsed,
          created_at: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          turns: [aiTurn],
          uiState: 'RECORDING',
          lastLLMResponse: parsed,
          canAdvance: false,
          missingRequirements: parsed.missing_requirements,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          uiState: 'RECORDING',
          error: '初期メッセージの取得に失敗しました。',
        }));
      }
    },
    [state.conversationId]
  );

  // Submit a turn
  const submitTurn = useCallback(
    async (audioBlob?: Blob, transcript?: string) => {
      if (!state.conversationId) return;
      if (state.currentStage === 1 && !state.stageMode) return;

      lastTurnRef.current = { audioBlob, transcript };

      // Optimistic update: add user message
      const userTurn: CoachingTurn = {
        id: `user-${Date.now()}`,
        conversation_id: state.conversationId,
        turn_number: state.turns.length,
        user_transcript: transcript || null,
        audio_url: null,
        ai_response: '',
        current_stage: state.currentStage,
        stage_mode: state.stageMode,
        coaching_response: null,
        created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        uiState: 'PROCESSING',
        turns: [...prev.turns, userTurn],
        error: null,
      }));

      try {
        const result = await coachingApi.submitTurn(state.conversationId, {
          audioBlob,
          transcript,
          stage: state.currentStage,
          mode: state.stageMode,
        });

        const response = parseLLMResponse(result.response, state.currentStage, state.stageMode);
        const { canAdvance: frontendCanAdvance } = canAdvanceFromStage(
          response.current_stage,
          response.current_stage_mode,
          response.extracted_data,
          response.confidence
        );
        const finalCanAdvance = response.can_advance && frontendCanAdvance;

        const aiTurn: CoachingTurn = {
          id: result.turn?.id || `ai-${Date.now()}`,
          conversation_id: state.conversationId,
          turn_number: state.turns.length + 1,
          user_transcript: null,
          audio_url: null,
          ai_response: response.assistant_message,
          current_stage: response.current_stage,
          stage_mode: response.current_stage_mode,
          coaching_response: response,
          created_at: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          turns: [...prev.turns, aiTurn],
          lastLLMResponse: response,
          canAdvance: finalCanAdvance,
          missingRequirements: response.missing_requirements,
          extractedData: {
            ...prev.extractedData,
            [String(response.current_stage)]: response.extracted_data,
          },
          stageSummaries: {
            ...prev.stageSummaries,
            [String(response.current_stage)]: response.stage_summary,
          },
          modeSwitchSuggestion:
            response.should_suggest_mode_switch && !prev.modeSwitchSuggestion.visible
              ? {
                  visible: true,
                  suggestedMode: response.suggested_mode,
                  reason: response.mode_switch_reason,
                }
              : prev.modeSwitchSuggestion,
          uiState: 'RECORDING',
          error: null,
        }));
      } catch (err) {
        // Remove optimistic user turn on error
        setState((prev) => ({
          ...prev,
          turns: prev.turns.filter((t) => t.id !== userTurn.id),
          uiState: 'RECORDING',
          error: 'メッセージの送信に失敗しました。もう一度お試しください。',
        }));
      }
    },
    [state.conversationId, state.currentStage, state.stageMode, state.turns]
  );

  // Advance to next stage
  const advanceStage = useCallback(async () => {
    if (!state.conversationId || !state.canAdvance) return;

    const nextStage = (state.currentStage + 1) as CoachingStage;

    if (state.currentStage >= 4) {
      // Session complete
      setState((prev) => ({ ...prev, uiState: 'SESSION_COMPLETE' }));
      return;
    }

    setState((prev) => ({ ...prev, uiState: 'PROCESSING', error: null }));

    try {
      const currentExtracted = state.extractedData[String(state.currentStage)];
      const response = await coachingApi.advanceStage(
        state.conversationId,
        nextStage,
        currentExtracted
      );
      const parsed = parseLLMResponse(response, nextStage, null);

      const aiTurn: CoachingTurn = {
        id: `stage-${nextStage}-${Date.now()}`,
        conversation_id: state.conversationId,
        turn_number: state.turns.length,
        user_transcript: null,
        audio_url: null,
        ai_response: parsed.assistant_message,
        current_stage: nextStage,
        stage_mode: null,
        coaching_response: parsed,
        created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        currentStage: nextStage,
        stageMode: null,
        canAdvance: false,
        turns: [...prev.turns, aiTurn],
        lastLLMResponse: parsed,
        missingRequirements: parsed.missing_requirements,
        uiState: 'RECORDING',
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        uiState: 'RECORDING',
        error: '次の段階への移行に失敗しました。',
      }));
    }
  }, [
    state.conversationId,
    state.canAdvance,
    state.currentStage,
    state.extractedData,
    state.turns,
  ]);

  // Regress to a previous stage
  const regressStage = useCallback(
    async (targetStage: 1 | 2 | 3) => {
      if (!state.conversationId) return;
      setState((prev) => ({
        ...prev,
        currentStage: targetStage,
        canAdvance: false,
        lastLLMResponse: null,
        uiState: 'PROCESSING',
      }));

      try {
        const response = await coachingApi.getInitialMessage(
          state.conversationId,
          targetStage,
          state.stageMode
        );
        const parsed = parseLLMResponse(response, targetStage, state.stageMode);
        const aiTurn: CoachingTurn = {
          id: `regress-${targetStage}-${Date.now()}`,
          conversation_id: state.conversationId,
          turn_number: state.turns.length,
          user_transcript: null,
          audio_url: null,
          ai_response: parsed.assistant_message,
          current_stage: targetStage,
          stage_mode: state.stageMode,
          coaching_response: parsed,
          created_at: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          turns: [...prev.turns, aiTurn],
          uiState: 'RECORDING',
        }));
      } catch {
        setState((prev) => ({ ...prev, uiState: 'RECORDING' }));
      }
    },
    [state.conversationId, state.stageMode, state.turns]
  );

  // Accept mode switch suggestion
  const acceptModeSwitchSuggestion = useCallback(async () => {
    if (!state.conversationId || !state.modeSwitchSuggestion.suggestedMode) return;
    const newMode = state.modeSwitchSuggestion.suggestedMode;
    setState((prev) => ({
      ...prev,
      stageMode: newMode,
      extractedData: { ...prev.extractedData, '1': null },
      canAdvance: false,
      modeSwitchSuggestion: { visible: false, suggestedMode: null, reason: null },
      uiState: 'PROCESSING',
    }));
    try {
      const response = await coachingApi.getInitialMessage(state.conversationId, 1, newMode);
      const parsed = parseLLMResponse(response, 1, newMode);
      const aiTurn: CoachingTurn = {
        id: `mode-switch-${Date.now()}`,
        conversation_id: state.conversationId,
        turn_number: state.turns.length,
        user_transcript: null,
        audio_url: null,
        ai_response: `モードを${newMode === 'logical' ? '論理整理' : '感情整理'}に切り替えました。${parsed.assistant_message}`,
        current_stage: 1,
        stage_mode: newMode,
        coaching_response: parsed,
        created_at: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        turns: [...prev.turns, aiTurn],
        uiState: 'RECORDING',
      }));
    } catch {
      setState((prev) => ({ ...prev, uiState: 'RECORDING' }));
    }
  }, [state.conversationId, state.modeSwitchSuggestion, state.turns]);

  // Decline mode switch suggestion
  const declineModeSwitchSuggestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modeSwitchSuggestion: { visible: false, suggestedMode: null, reason: null },
    }));
  }, []);

  // End session
  const endSession = useCallback(async () => {
    if (!state.conversationId) return;
    setState((prev) => ({ ...prev, uiState: 'PROCESSING' }));
    try {
      await coachingApi.endSession(state.conversationId);
      router.push(`/dialogue/results?id=${state.conversationId}`);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        uiState: 'RECORDING',
        error: 'セッションの終了に失敗しました。',
      }));
    }
  }, [state.conversationId, router]);

  // Retry last turn
  const retryTurn = useCallback(() => {
    if (lastTurnRef.current) {
      submitTurn(lastTurnRef.current.audioBlob, lastTurnRef.current.transcript);
    }
  }, [submitTurn]);

  return {
    ...state,
    initializeSession,
    selectMode,
    submitTurn,
    advanceStage,
    regressStage,
    acceptModeSwitchSuggestion,
    declineModeSwitchSuggestion,
    endSession,
    retryTurn,
  };
}
