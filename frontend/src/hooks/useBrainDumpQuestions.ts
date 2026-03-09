'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchBrainDumpQuestion, fetchIntegrationQuestion } from '@/lib/api';
import { selectNextQuestion } from '@/data/stimulusQuestions';

interface UseBrainDumpQuestionsOptions {
  silenceTriggered: boolean;
  resetTrigger: () => void;
  transcript: string;
  interimTranscript: string;
  frequencyData: number[];
  elapsedSeconds: number;
  phase: 'free' | 'stimulation' | 'integration';
  isRecording: boolean;
}

interface UseBrainDumpQuestionsReturn {
  activeQuestion: string | null;
  questionVisible: boolean;
  isLoadingQuestion: boolean;
  fetchIntegration: () => Promise<string | null>;
  reset: () => void;
}

const SPEECH_THRESHOLD = 0.08;

export default function useBrainDumpQuestions({
  silenceTriggered,
  resetTrigger,
  transcript,
  interimTranscript,
  frequencyData,
  elapsedSeconds,
  phase,
  isRecording,
}: UseBrainDumpQuestionsOptions): UseBrainDumpQuestionsReturn {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  const previousQuestionsRef = useRef<string[]>([]);
  const cooldownRef = useRef(false);
  const staticShownRef = useRef<Set<string>>(new Set());
  const staticCountRef = useRef(0);
  const lastInterimRef = useRef('');

  // Detect user speaking to dismiss question
  useEffect(() => {
    if (!activeQuestion || !questionVisible) return;

    // Check interim transcript change
    if (interimTranscript !== lastInterimRef.current && interimTranscript.length > 0) {
      dismissQuestion();
    }

    // Check audio level
    if (frequencyData.length > 0) {
      const avg = frequencyData.reduce((s, v) => s + v, 0) / frequencyData.length;
      if (avg > SPEECH_THRESHOLD) {
        dismissQuestion();
      }
    }

    lastInterimRef.current = interimTranscript;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interimTranscript, frequencyData, activeQuestion, questionVisible]);

  const dismissQuestion = useCallback(() => {
    setQuestionVisible(false);
    const clearTimer = setTimeout(() => setActiveQuestion(null), 400);
    cooldownRef.current = true;
    const cooldownTimer = setTimeout(() => {
      cooldownRef.current = false;
    }, 3000);
    return () => {
      clearTimeout(clearTimer);
      clearTimeout(cooldownTimer);
    };
  }, []);

  // Silence triggered → fetch AI question
  useEffect(() => {
    if (!silenceTriggered || phase !== 'stimulation' || cooldownRef.current || activeQuestion !== null) return;

    resetTrigger();

    // Not enough transcript for AI — use static fallback
    if (transcript.length < 20) {
      const q = selectNextQuestion(staticShownRef.current, staticCountRef.current);
      if (q) {
        staticShownRef.current.add(q.id);
        staticCountRef.current += 1;
        setActiveQuestion(q.text);
        setQuestionVisible(true);
        cooldownRef.current = true;
      }
      return;
    }

    let cancelled = false;
    setIsLoadingQuestion(true);

    fetchBrainDumpQuestion(transcript, previousQuestionsRef.current, elapsedSeconds)
      .then((question) => {
        if (cancelled) return;
        setIsLoadingQuestion(false);

        if (question) {
          previousQuestionsRef.current.push(question);
          setActiveQuestion(question);
          setQuestionVisible(true);
          cooldownRef.current = true;
        } else {
          // Fallback to static
          const q = selectNextQuestion(staticShownRef.current, staticCountRef.current);
          if (q) {
            staticShownRef.current.add(q.id);
            staticCountRef.current += 1;
            setActiveQuestion(q.text);
            setQuestionVisible(true);
            cooldownRef.current = true;
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoadingQuestion(false);
        const q = selectNextQuestion(staticShownRef.current, staticCountRef.current);
        if (q) {
          staticShownRef.current.add(q.id);
          staticCountRef.current += 1;
          setActiveQuestion(q.text);
          setQuestionVisible(true);
          cooldownRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silenceTriggered]);

  const fetchIntegration = useCallback(async (): Promise<string | null> => {
    if (transcript.length < 20) return null;
    try {
      return await fetchIntegrationQuestion(transcript);
    } catch {
      return null;
    }
  }, [transcript]);

  const reset = useCallback(() => {
    setActiveQuestion(null);
    setQuestionVisible(false);
    setIsLoadingQuestion(false);
    previousQuestionsRef.current = [];
    cooldownRef.current = false;
    staticShownRef.current = new Set();
    staticCountRef.current = 0;
    lastInterimRef.current = '';
  }, []);

  // Reset when recording starts
  useEffect(() => {
    if (isRecording) {
      reset();
    }
  }, [isRecording, reset]);

  return {
    activeQuestion,
    questionVisible,
    isLoadingQuestion,
    fetchIntegration,
    reset,
  };
}
