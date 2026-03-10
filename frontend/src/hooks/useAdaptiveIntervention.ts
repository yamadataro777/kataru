'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSilenceDetector from './useSilenceDetector';
import {
  selectQuestion,
  selectAdaptiveQuestion,
  selectNudge,
  selectEmotionalNudge,
  detectStrongEmotion,
  extractLightContext,
  getPhase,
  type Phase,
} from '@/lib/question-library';
import { fetchBrainDumpQuestion } from '@/lib/api';

const NUDGE_THRESHOLD_MS = 4000;
const QUESTION_THRESHOLD_MS = 7000;
const STUCK_THRESHOLD_MS = 15000;
const COOLDOWN_SEC = 25;
const SESSION_WARMUP_SEC = 15;
const MAX_INTERVENTIONS = 10;
const AI_QUESTION_MIN_CHARS = 300;
const AI_QUESTION_DELTA_CHARS = 200;

type InterventionType = 'nudge' | 'question' | null;

interface UseAdaptiveInterventionReturn {
  activeQuestion: string | null;
  questionPhase: 'typing' | 'hold' | null;
  interventionType: InterventionType;
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
  const [interventionType, setInterventionType] = useState<InterventionType>(null);

  const usedIdsRef = useRef<Set<string>>(new Set());
  const usedCategoriesRef = useRef<string[]>([]);
  const interventionCountRef = useRef(0);
  const lastInterventionTimeRef = useRef(0);
  const firedRef = useRef(false);
  const nudgeFiredRef = useRef(false);

  // AI question cache
  const aiQuestionRef = useRef<string | null>(null);
  const aiGeneratingRef = useRef(false);
  const lastAITranscriptLenRef = useRef(0);

  // Light context cache
  const contextRef = useRef<{
    informationDensity: 'high' | 'medium' | 'low';
    topicCount: number;
  }>({ informationDensity: 'low', topicCount: 0 });

  // Reset all state when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveQuestion(null);
      setQuestionPhase(null);
      setInterventionType(null);
      usedIdsRef.current = new Set();
      usedCategoriesRef.current = [];
      interventionCountRef.current = 0;
      lastInterventionTimeRef.current = 0;
      firedRef.current = false;
      nudgeFiredRef.current = false;
      aiQuestionRef.current = null;
      aiGeneratingRef.current = false;
      lastAITranscriptLenRef.current = 0;
      contextRef.current = { informationDensity: 'low', topicCount: 0 };
    }
  }, [isRecording]);

  // Background context extraction (every ~200 chars of transcript growth)
  useEffect(() => {
    if (!isRecording || transcript.length < 100) return;
    // Extract every ~200 chars
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
      // Fallback to library — no action needed
    } finally {
      aiGeneratingRef.current = false;
    }
  }, []);

  // Trigger AI question generation when transcript grows enough
  useEffect(() => {
    if (!isRecording) return;
    if (transcript.length < AI_QUESTION_MIN_CHARS) return;
    if (transcript.length - lastAITranscriptLenRef.current < AI_QUESTION_DELTA_CHARS) return;
    if (aiQuestionRef.current) return; // Already have a cached question

    lastAITranscriptLenRef.current = transcript.length;
    const phase = getPhase(duration);
    generateAIQuestion(transcript, phase);
  }, [transcript, isRecording, duration, generateAIQuestion]);

  // Main silence check — runs on every duration tick (1s)
  useEffect(() => {
    if (!isRecording) return;
    if (duration < SESSION_WARMUP_SEC) return;
    if (interventionCountRef.current >= MAX_INTERVENTIONS) return;

    const silenceMs = silenceMsRef.current;

    // Flow state — reset fired flags
    if (silenceMs < NUDGE_THRESHOLD_MS) {
      firedRef.current = false;
      nudgeFiredRef.current = false;
      return;
    }

    // Cooldown guard (applies to questions, not nudges)
    const timeSinceLastIntervention = duration - lastInterventionTimeRef.current;

    // 4-7s: Nudge
    if (silenceMs >= NUDGE_THRESHOLD_MS && silenceMs < QUESTION_THRESHOLD_MS) {
      if (nudgeFiredRef.current) return;
      if (timeSinceLastIntervention < COOLDOWN_SEC) return;
      nudgeFiredRef.current = true;

      // Check for strong emotion → acceptance nudge
      const text = detectStrongEmotion(transcript)
        ? selectEmotionalNudge()
        : selectNudge();

      setActiveQuestion(text);
      setQuestionPhase('hold'); // No typing animation for nudges
      setInterventionType('nudge');
      return;
    }

    // 7s+: Question intervention
    if (silenceMs >= QUESTION_THRESHOLD_MS) {
      if (firedRef.current) return;
      if (timeSinceLastIntervention < COOLDOWN_SEC) return;
      firedRef.current = true;

      const phase = getPhase(duration);
      const isStuck = silenceMs >= STUCK_THRESHOLD_MS;

      // Check for strong emotion → acceptance nudge instead of question
      if (detectStrongEmotion(transcript)) {
        const text = selectEmotionalNudge();
        setActiveQuestion(text);
        setQuestionPhase('hold');
        setInterventionType('nudge');
        interventionCountRef.current += 1;
        lastInterventionTimeRef.current = duration;
        return;
      }

      let questionText: string | null = null;

      // Priority: AI question cache > adaptive selection > basic selection
      if (aiQuestionRef.current && !isStuck) {
        questionText = aiQuestionRef.current;
        aiQuestionRef.current = null;
      } else if (interventionCountRef.current >= 2) {
        // Level 2: Adaptive scoring
        const question = selectAdaptiveQuestion({
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
          phase,
          informationDensity: contextRef.current.informationDensity,
          topicCount: contextRef.current.topicCount,
          isStuck,
        });
        if (question) {
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          questionText = question.text;
        }
      } else {
        // Level 1: Basic library selection
        const question = selectQuestion({
          durationSec: duration,
          usedIds: usedIdsRef.current,
          usedCategories: usedCategoriesRef.current,
          interventionCount: interventionCountRef.current,
        });
        if (question) {
          usedIdsRef.current.add(question.id);
          usedCategoriesRef.current.push(question.category);
          questionText = question.text;
        }
      }

      if (!questionText) return;

      interventionCountRef.current += 1;
      lastInterventionTimeRef.current = duration;

      setActiveQuestion(questionText);
      setQuestionPhase('typing');
      setInterventionType('question');

      const typingMs = questionText.length * 67;
      setTimeout(() => setQuestionPhase('hold'), typingMs);
    }
  }, [duration, isRecording, silenceMsRef, transcript]);

  return { activeQuestion, questionPhase, interventionType };
}
