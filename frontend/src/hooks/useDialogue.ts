'use client';

import { useState, useCallback, useRef } from 'react';
import { Conversation, ConversationTurn, ConversationPhase } from '@/types/conversation';
import {
  createConversation as apiCreateConversation,
  sendTurn as apiSendTurn,
  endConversation as apiEndConversation,
} from '@/lib/api';

interface UseDialogueResult {
  conversation: Conversation | null;
  turns: ConversationTurn[];
  phase: ConversationPhase;
  isLoading: boolean;
  isSending: boolean;
  isEnding: boolean;
  error: string | null;
  startConversation: () => Promise<void>;
  submitTurn: (audioBlob?: Blob, transcript?: string) => Promise<void>;
  endSession: () => Promise<void>;
}

export default function useDialogue(): UseDialogueResult {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [phase, setPhase] = useState<ConversationPhase>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const startConversation = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { conversation: conv, turn } = await apiCreateConversation();
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
      setError(err instanceof Error ? err.message : '対話の開始に失敗しました');
      startedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    isSending,
    isEnding,
    error,
    startConversation,
    submitTurn,
    endSession,
  };
}
