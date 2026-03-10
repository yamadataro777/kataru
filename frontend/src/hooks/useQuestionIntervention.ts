'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSilenceDetector from './useSilenceDetector';
import { selectQuestion, type Question } from '@/lib/question-library';

const SILENCE_TRIGGER_MS = 7000;
const COOLDOWN_SEC = 30;
const SESSION_WARMUP_SEC = 60;
const MAX_INTERVENTIONS = 8;

interface UseQuestionInterventionReturn {
  activeQuestion: string | null;
  questionPhase: 'typing' | 'hold' | null;
}

export default function useQuestionIntervention(
  analyserNode: AnalyserNode | null,
  isRecording: boolean,
  duration: number,
): UseQuestionInterventionReturn {
  const silenceMsRef = useSilenceDetector(analyserNode, isRecording);

  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [questionPhase, setQuestionPhase] = useState<'typing' | 'hold' | null>(null);

  const usedIdsRef = useRef<Set<string>>(new Set());
  const usedCategoriesRef = useRef<string[]>([]);
  const interventionCountRef = useRef(0);
  const lastInterventionTimeRef = useRef(0);
  const firedRef = useRef(false);

  // Reset all state when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveQuestion(null);
      setQuestionPhase(null);
      usedIdsRef.current = new Set();
      usedCategoriesRef.current = [];
      interventionCountRef.current = 0;
      lastInterventionTimeRef.current = 0;
      firedRef.current = false;
    }
  }, [isRecording]);

  // Check silence on every duration tick (1s)
  useEffect(() => {
    if (!isRecording) return;

    // Warmup guard
    if (duration < SESSION_WARMUP_SEC) return;

    // Max interventions guard
    if (interventionCountRef.current >= MAX_INTERVENTIONS) return;

    // Cooldown guard
    if (duration - lastInterventionTimeRef.current < COOLDOWN_SEC) return;

    // Check silence threshold
    if (silenceMsRef.current < SILENCE_TRIGGER_MS) {
      firedRef.current = false;
      return;
    }

    // Don't fire again for the same silence period
    if (firedRef.current) return;
    firedRef.current = true;

    const question = selectQuestion({
      durationSec: duration,
      usedIds: usedIdsRef.current,
      usedCategories: usedCategoriesRef.current,
      interventionCount: interventionCountRef.current,
    });

    if (!question) return;

    usedIdsRef.current.add(question.id);
    usedCategoriesRef.current.push(question.category);
    interventionCountRef.current += 1;
    lastInterventionTimeRef.current = duration;

    setActiveQuestion(question.text);
    setQuestionPhase('typing');

    const typingMs = question.text.length * 67;
    setTimeout(() => setQuestionPhase('hold'), typingMs);
  }, [duration, isRecording, silenceMsRef]);

  return { activeQuestion, questionPhase };
}
