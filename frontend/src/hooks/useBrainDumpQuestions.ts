'use client';

import { useRef, useCallback } from 'react';
import { fetchBrainDumpQuestion, fetchIntegrationQuestion } from '@/lib/api';
import { selectNextQuestion, integrationPrompt } from '@/data/stimulusQuestions';

export type QuestionPhase = 'expansion' | 'connection' | 'confrontation';

interface UseBrainDumpQuestionsReturn {
  getQuestion: (transcript: string, duration: number) => Promise<string | null>;
  getIntegrationQuestion: (transcript: string) => Promise<string>;
  reset: () => void;
}

/**
 * Manages question generation for brain dump sessions.
 * Tries AI first, falls back to static pool.
 */
export default function useBrainDumpQuestions(): UseBrainDumpQuestionsReturn {
  const shownQuestionsRef = useRef<Set<string>>(new Set());
  const shownTextsRef = useRef<string[]>([]);
  const countRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const MAX_CONSECUTIVE_FAILS = 3;

  const getPhase = (duration: number): QuestionPhase => {
    if (duration < 150) return 'expansion';
    if (duration < 270) return 'connection';
    return 'confrontation';
  };

  const getQuestion = useCallback(async (transcript: string, duration: number): Promise<string | null> => {
    // After 3 consecutive AI failures, static only
    if (consecutiveFailsRef.current < MAX_CONSECUTIVE_FAILS) {
      try {
        const phase = getPhase(duration);
        const result = await fetchBrainDumpQuestion(
          transcript,
          duration,
          shownTextsRef.current,
          phase,
        );

        if (result.question) {
          consecutiveFailsRef.current = 0;
          shownTextsRef.current.push(result.question);
          countRef.current += 1;
          return result.question;
        }
        consecutiveFailsRef.current += 1;
      } catch {
        consecutiveFailsRef.current += 1;
      }
    }

    // Static fallback
    const staticQ = selectNextQuestion(
      shownQuestionsRef.current,
      countRef.current,
    );

    if (staticQ) {
      shownQuestionsRef.current.add(staticQ.id);
      shownTextsRef.current.push(staticQ.text);
      countRef.current += 1;
      return staticQ.text;
    }

    return null;
  }, []);

  const getIntegrationQuestion = useCallback(async (transcript: string): Promise<string> => {
    try {
      const result = await fetchIntegrationQuestion(transcript);
      return result.question;
    } catch {
      return integrationPrompt;
    }
  }, []);

  const reset = useCallback(() => {
    shownQuestionsRef.current = new Set();
    shownTextsRef.current = [];
    countRef.current = 0;
    consecutiveFailsRef.current = 0;
  }, []);

  return { getQuestion, getIntegrationQuestion, reset };
}
