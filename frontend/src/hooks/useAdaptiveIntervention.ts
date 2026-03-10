'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSilenceDetector from './useSilenceDetector';
import {
  selectQuestion,
  selectAdaptiveQuestion,
  selectQuestionByTrigger,
  selectDifferentQuestion,
  selectEmotionalNudge,
  detectStrongEmotion,
  detectStagnation,
  extractLightContext,
  getPhase,
  type Phase,
  type QuestionCategory,
} from '@/lib/question-library';
import { fetchBrainDumpQuestion } from '@/lib/api';

const QUESTION_THRESHOLD_MS = 4000;
const STAGNATION_SILENCE_MS = 3000;
const LONG_TALK_THRESHOLD_SEC = 120;
const COOLDOWN_SEC = 50;
const SESSION_WARMUP_SEC = 0;
const MAX_INTERVENTIONS = 2;
const AI_QUESTION_MIN_CHARS = 300;
const AI_QUESTION_DELTA_CHARS = 200;
const SILENCE_MESSAGE_MIN_MS = 3000;
const AUTO_DISMISS_SEC = 15;

interface UseAdaptiveInterventionReturn {
  activeQuestion: string | null;
  questionPhase: 'typing' | 'hold' | null;
  silenceProgress: number;
  silenceMessage: string | null;
  onContinue: () => void;
  onLater: () => void;
  onDifferent: () => void;
}

export default function useAdaptiveIntervention(
  transcript: string,
  interimTranscript: string,
  isRecording: boolean,
  duration: number,
  analyserNode: AnalyserNode | null,
): UseAdaptiveInterventionReturn {
  const silenceMsRef = useSilenceDetector(transcript, interimTranscript, isRecording, analyserNode);

  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [questionPhase, setQuestionPhase] = useState<'typing' | 'hold' | null>(null);
  const [silenceProgress, setSilenceProgress] = useState(0);
  const [silenceMessage, setSilenceMessage] = useState<string | null>(null);

  const usedIdsRef = useRef<Set<string>>(new Set());
  const usedCategoriesRef = useRef<string[]>([]);
  const interventionCountRef = useRef(0);
  const lastInterventionTimeRef = useRef(-COOLDOWN_SEC);
  const firedRef = useRef(false);
  const hasActiveRef = useRef(false);
  const currentCategoryRef = useRef<QuestionCategory | null>(null);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prompt readiness state
  const promptReadyRef = useRef(false);
  const promptReadyQuestionRef = useRef<string | null>(null);

  // Long talk tracking
  const lastSilenceAbove3sRef = useRef(0);

  // Topic jump tracking
  const lastTopicCountRef = useRef(0);

  // AI question cache
  const aiQuestionRef = useRef<string | null>(null);
  const aiGeneratingRef = useRef(false);
  const lastAITranscriptLenRef = useRef(0);

  // Light context cache
  const contextRef = useRef<{
    informationDensity: 'high' | 'medium' | 'low';
    topicCount: number;
  }>({ informationDensity: 'low', topicCount: 0 });

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const dismissQuestion = useCallback(() => {
    clearAutoDismiss();
    hasActiveRef.current = false;
    promptReadyRef.current = false;
    promptReadyQuestionRef.current = null;
    currentCategoryRef.current = null;
    setActiveQuestion(null);
    setQuestionPhase(null);
  }, [clearAutoDismiss]);

  const showQuestion = useCallback((text: string, category: QuestionCategory | null) => {
    clearAutoDismiss();
    hasActiveRef.current = true;
    currentCategoryRef.current = category;
    setActiveQuestion(text);
    setQuestionPhase('typing');

    const typingMs = text.length * 67;
    setTimeout(() => setQuestionPhase('hold'), typingMs);

    // Auto-dismiss after 15s
    autoDismissTimerRef.current = setTimeout(() => {
      dismissQuestion();
    }, AUTO_DISMISS_SEC * 1000);
  }, [clearAutoDismiss, dismissQuestion]);

  // === Callbacks for QuestionTray ===
  const onContinue = useCallback(() => {
    dismissQuestion();
  }, [dismissQuestion]);

  const onLater = useCallback(() => {
    dismissQuestion();
  }, [dismissQuestion]);

  const onDifferent = useCallback(() => {
    const category = currentCategoryRef.current;
    if (!category) return;

    const ctx = {
      durationSec: duration,
      usedIds: usedIdsRef.current,
      usedCategories: usedCategoriesRef.current,
      interventionCount: interventionCountRef.current,
    };
    const question = selectDifferentQuestion(ctx, category);
    if (question) {
      usedIdsRef.current.add(question.id);
      usedCategoriesRef.current.push(question.category);
      showQuestion(question.text, question.category);
    }
    // Does NOT consume MAX_INTERVENTIONS
  }, [duration, showQuestion]);

  // Reset all state when recording starts
  useEffect(() => {
    if (isRecording) {
      dismissQuestion();
      usedIdsRef.current = new Set();
      usedCategoriesRef.current = [];
      interventionCountRef.current = 0;
      lastInterventionTimeRef.current = 0;
      firedRef.current = false;
      aiQuestionRef.current = null;
      aiGeneratingRef.current = false;
      lastAITranscriptLenRef.current = 0;
      contextRef.current = { informationDensity: 'low', topicCount: 0 };
      lastSilenceAbove3sRef.current = 0;
      lastTopicCountRef.current = 0;
      setSilenceMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Background context extraction
  useEffect(() => {
    if (!isRecording || transcript.length < 100) return;
    const ctx = extractLightContext(transcript);
    contextRef.current = ctx;
  }, [transcript, isRecording]);

  // Background AI question generation
  const generateAIQuestion = useCallback(async (currentTranscript: string, phase: Phase) => {
    if (aiGeneratingRef.current) return;
    aiGeneratingRef.current = true;
    try {
      const result = await fetchBrainDumpQuestion(
        currentTranscript.slice(-500),
        0,
        [...usedIdsRef.current],
        phase,
      );
      if (result.question) {
        aiQuestionRef.current = result.question;
      }
    } catch {
      // Fallback to library
    } finally {
      aiGeneratingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    if (transcript.length < AI_QUESTION_MIN_CHARS) return;
    if (transcript.length - lastAITranscriptLenRef.current < AI_QUESTION_DELTA_CHARS) return;
    if (aiQuestionRef.current) return;

    lastAITranscriptLenRef.current = transcript.length;
    const phase = getPhase(duration);
    generateAIQuestion(transcript, phase);
  }, [transcript, isRecording, duration, generateAIQuestion]);

  // Silence progress for gauge (200ms polling)
  useEffect(() => {
    if (!isRecording) {
      setSilenceProgress(0);
      setSilenceMessage(null);
      return;
    }
    const id = setInterval(() => {
      const warmupDone = duration >= SESSION_WARMUP_SEC;
      const underMax = interventionCountRef.current < MAX_INTERVENTIONS;
      const cooldownDone = (duration - lastInterventionTimeRef.current) >= COOLDOWN_SEC;

      if (!warmupDone || !underMax || !cooldownDone) {
        setSilenceProgress(0);
        // Still show silence message during warmup if silence is long enough
        if (warmupDone && silenceMsRef.current >= SILENCE_MESSAGE_MIN_MS && silenceMsRef.current < QUESTION_THRESHOLD_MS) {
          setSilenceMessage('考え中でも大丈夫');
        } else {
          setSilenceMessage(null);
        }
        return;
      }
      const p = Math.min(silenceMsRef.current / QUESTION_THRESHOLD_MS, 1);
      setSilenceProgress(p);

      // Silence message: 3-6s range
      if (silenceMsRef.current >= SILENCE_MESSAGE_MIN_MS && silenceMsRef.current < QUESTION_THRESHOLD_MS && !hasActiveRef.current) {
        setSilenceMessage('考え中でも大丈夫');
      } else {
        setSilenceMessage(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [isRecording, duration, silenceMsRef]);

  // Main intervention check — runs on every duration tick (1s)
  useEffect(() => {
    if (!isRecording) return;
    if (duration < SESSION_WARMUP_SEC) return;
    if (interventionCountRef.current >= MAX_INTERVENTIONS) return;

    const silenceMs = silenceMsRef.current;

    // Track silence for long talk detection
    if (silenceMs >= 3000) {
      lastSilenceAbove3sRef.current = duration;
    }

    // Flow state — user is speaking, reset fired flags and clear displayed question
    if (silenceMs < STAGNATION_SILENCE_MS) {
      firedRef.current = false;
      if (hasActiveRef.current && !promptReadyRef.current) {
        dismissQuestion();
      }
      return;
    }

    const timeSinceLastIntervention = duration - lastInterventionTimeRef.current;
    if (timeSinceLastIntervention < COOLDOWN_SEC) return;

    // === Trigger 1: Stagnation (filler words + 3s+ silence) ===
    if (silenceMs >= STAGNATION_SILENCE_MS && silenceMs < QUESTION_THRESHOLD_MS && !promptReadyRef.current) {
      if (detectStagnation(transcript)) {
        const ctx = {
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
        };
        const question = selectQuestionByTrigger(ctx, 'stagnation');
        if (question) {
          promptReadyRef.current = true;
          promptReadyQuestionRef.current = question.text;
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          currentCategoryRef.current = question.category;
        }
      }
    }

    // === Trigger 2: Long talk (120s+ continuous speech) ===
    if (!promptReadyRef.current && !firedRef.current) {
      const continuousTalkSec = duration - lastSilenceAbove3sRef.current;
      if (continuousTalkSec >= LONG_TALK_THRESHOLD_SEC) {
        const ctx = {
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
        };
        const question = selectQuestionByTrigger(ctx, 'long_talk');
        if (question) {
          promptReadyRef.current = true;
          promptReadyQuestionRef.current = question.text;
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          currentCategoryRef.current = question.category;
        }
      }
    }

    // === Trigger 3: Topic jump ===
    if (!promptReadyRef.current && !firedRef.current) {
      const currentTopicCount = contextRef.current.topicCount;
      if (currentTopicCount - lastTopicCountRef.current >= 2) {
        const ctx = {
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
        };
        const question = selectQuestionByTrigger(ctx, 'topic_jump');
        if (question) {
          promptReadyRef.current = true;
          promptReadyQuestionRef.current = question.text;
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          currentCategoryRef.current = question.category;
        }
      }
      lastTopicCountRef.current = currentTopicCount;
    }

    // === Trigger 4: Silence (6s+) — show prepared question or select new one ===
    if (silenceMs >= QUESTION_THRESHOLD_MS) {
      if (firedRef.current) return;
      firedRef.current = true;

      // Emotion override
      if (detectStrongEmotion(transcript)) {
        const text = selectEmotionalNudge();
        showQuestion(text, null);
        interventionCountRef.current += 1;
        lastInterventionTimeRef.current = duration;
        return;
      }

      // Use prepared question if available
      if (promptReadyRef.current && promptReadyQuestionRef.current) {
        showQuestion(promptReadyQuestionRef.current, currentCategoryRef.current);
        promptReadyRef.current = false;
        promptReadyQuestionRef.current = null;
        interventionCountRef.current += 1;
        lastInterventionTimeRef.current = duration;
        return;
      }

      // Otherwise select a new question
      let questionText: string | null = null;
      const phase = getPhase(duration);

      // Priority: AI cache > adaptive > basic
      if (aiQuestionRef.current) {
        questionText = aiQuestionRef.current;
        aiQuestionRef.current = null;
      } else if (interventionCountRef.current >= 1) {
        const question = selectAdaptiveQuestion({
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
          phase,
          informationDensity: contextRef.current.informationDensity,
          topicCount: contextRef.current.topicCount,
        });
        if (question) {
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          currentCategoryRef.current = question.category;
          questionText = question.text;
        }
      } else {
        const question = selectQuestion({
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
        });
        if (question) {
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          currentCategoryRef.current = question.category;
          questionText = question.text;
        }
      }

      if (!questionText) return;

      interventionCountRef.current += 1;
      lastInterventionTimeRef.current = duration;
      showQuestion(questionText, currentCategoryRef.current);
    }
  }, [duration, isRecording, silenceMsRef, transcript, dismissQuestion, showQuestion]);

  return { activeQuestion, questionPhase, silenceProgress, silenceMessage, onContinue, onLater, onDifferent };
}
