'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation, ConversationTurn, ConversationPhase } from '@/types/conversation';
import {
  createConversation as apiCreateConversation,
  sendTurn as apiSendTurn,
  endConversation as apiEndConversation,
} from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const HEALTH_TIMEOUT = 3_000;
const MAX_WAKE_POLLS = 20;
const POLL_INTERVAL = 3_000;

async function checkHealth(signal: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);

  const onParentAbort = () => controller.abort();
  signal.addEventListener('abort', onParentAbort);

  try {
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onParentAbort);
  }
}

interface UseDialogueResult {
  conversation: Conversation | null;
  turns: ConversationTurn[];
  phase: ConversationPhase;
  isLoading: boolean;
  isWaking: boolean;
  wakingProgress: number;
  isSending: boolean;
  isEnding: boolean;
  error: string | null;
  startConversation: () => Promise<void>;
  retryStart: () => void;
  submitTurn: (audioBlob?: Blob, transcript?: string) => Promise<void>;
  endSession: () => Promise<void>;
}

export default function useDialogue(): UseDialogueResult {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [phase, setPhase] = useState<ConversationPhase>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [wakingProgress, setWakingProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const ensureServerAwake = useCallback(async (signal: AbortSignal): Promise<boolean> => {
    // Quick health check
    const isUp = await checkHealth(signal);
    if (isUp) return true;

    // Server is cold — start polling
    setIsWaking(true);
    setWakingProgress(0);

    for (let i = 0; i < MAX_WAKE_POLLS; i++) {
      if (signal.aborted) return false;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      if (signal.aborted) return false;

      setWakingProgress(Math.round(((i + 1) / MAX_WAKE_POLLS) * 100));
      const alive = await checkHealth(signal);
      if (alive) {
        setIsWaking(false);
        setWakingProgress(100);
        return true;
      }
    }

    setIsWaking(false);
    return false;
  }, []);

  const startConversation = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setIsWaking(false);
    setWakingProgress(0);

    try {
      const serverReady = await ensureServerAwake(controller.signal);
      if (controller.signal.aborted) return;

      if (!serverReady) {
        setError('サーバーに接続できませんでした。時間を置いて再試行してください。');
        startedRef.current = false;
        setIsLoading(false);
        return;
      }

      const { conversation: conv, turn } = await apiCreateConversation();
      if (controller.signal.aborted) return;

      setConversation(conv);
      setPhase(conv.phase as ConversationPhase);
      setTurns([{
        id: '',
        conversation_id: conv.id,
        turn_number: 0,
        created_at: new Date().toISOString(),
        user_transcript: null,
        audio_url: null,
        ai_response: turn.ai_response,
        question_type: 'coaching',
        phase: 'intake',
      }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : '対話の開始に失敗しました');
      startedRef.current = false;
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsWaking(false);
      }
    }
  }, [ensureServerAwake]);

  const retryStart = useCallback(() => {
    startedRef.current = false;
    setError(null);
    startConversation();
  }, [startConversation]);

  const submitTurn = useCallback(async (audioBlob?: Blob, transcript?: string) => {
    if (!conversation || isSending) return;
    setIsSending(true);
    setError(null);

    try {
      const { turn, conversation: updatedConv } = await apiSendTurn(
        conversation.id,
        audioBlob,
        transcript
      );

      const newTurn: ConversationTurn = {
        id: turn.turn_number?.toString() || '',
        conversation_id: conversation.id,
        turn_number: turn.turn_number,
        created_at: new Date().toISOString(),
        user_transcript: turn.user_transcript || transcript || null,
        audio_url: null,
        ai_response: turn.ai_response,
        question_type: turn.question_type as ConversationTurn['question_type'],
        phase: turn.phase as ConversationPhase,
      };

      setTurns((prev) => [...prev, newTurn]);
      setConversation(updatedConv);
      setPhase(updatedConv.phase as ConversationPhase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ターンの送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  }, [conversation, isSending]);

  const endSession = useCallback(async () => {
    if (!conversation || isEnding) return;
    setIsEnding(true);
    setError(null);

    try {
      const { conversation: updatedConv } = await apiEndConversation(conversation.id);
      setConversation(updatedConv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッション終了に失敗しました');
    } finally {
      setIsEnding(false);
    }
  }, [conversation, isEnding]);

  return {
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
    submitTurn,
    endSession,
  };
}
