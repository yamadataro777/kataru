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

// Must be higher than silence detector threshold (0.05) to avoid
// dismissing on ambient noise that already passed silence detection
const SPEECH_DISMISS_THRESHOLD = 0.15;
// Grace period after showing question before allowing speech-dismissal
const MIN_DISPLAY_MS = 2000;

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
  const shownAtRef = useRef<number>(0);
  const interimAtShowRef = useRef('');

  // Detect user speaking to dismiss question
  useEffect(() => {
    if (!activeQuestion || !questionVisible) return;

    // Grace period: don't dismiss within MIN_DISPLAY_MS of showing
    if (Date.now() - shownAtRef.current < MIN_DISPLAY_MS) return;

    // Check interim transcript: only dismiss if NEW text appeared after the question was shown
    const newInterim = interimTranscript.length > interimAtShowRef.current.length &&
      interimTranscript !== interimAtShowRef.current;
    if (newInterim) {
      dismissQuestion();
      return;
    }

    // Check sustained audio level (average must clearly exceed threshold)
    if (frequencyData.length > 0) {
      const avg = frequencyData.reduce((s, v) => s + v, 0) / frequencyData.length;
      if (avg > SPEECH_DISMISS_THRESHOLD) {
        dismissQuestion();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interimTranscript, frequencyData, activeQuestion, questionVisible]);

  const dismissQuestion = useCallback(() => {
    setQuestionVisible(false);
    setTimeout(() => setActiveQuestion(null), 400);
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 3000);
  }, []);

  const showQuestion = useCallback((text: string) => {
    setActiveQuestion(text);
    setQuestionVisible(true);
    shownAtRef.current = Date.now();
    interimAtShowRef.current = interimTranscript;
    cooldownRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence triggered → fetch AI question
  // IMPORTANT: always resetTrigger() so the silence detector can re-fire
  useEffect(() => {
    if (!silenceTriggered) return;

    // Always reset the trigger so it can fire again later
    resetTrigger();

    if (phase !== 'stimulation' || cooldownRef.current || activeQuestion !== null || isLoadingQuestion) return;

    // Not enough transcript for AI — use static fallback
    if (transcript.length < 20) {
      const q = selectNextQuestion(staticShownRef.current, staticCountRef.current);
      if (q) {
        staticShownRef.current.add(q.id);
        staticCountRef.current += 1;
        showQuestion(q.text);
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
          showQuestion(question);
        } else {
          // Fallback to static
          const q = selectNextQuestion(staticShownRef.current, staticCountRef.current);
          if (q) {
            staticShownRef.current.add(q.id);
            staticCountRef.current += 1;
            showQuestion(q.text);
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
          showQuestion(q.text);
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
    shownAtRef.current = 0;
    interimAtShowRef.current = '';
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
