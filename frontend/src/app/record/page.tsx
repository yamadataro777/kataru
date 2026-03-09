'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import RecordTimer from '@/components/recording/RecordTimer';
import RecordControls from '@/components/recording/RecordControls';
import StimulusPrompt from '@/components/recording/StimulusPrompt';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import useBrainDumpQuestions from '@/hooks/useBrainDumpQuestions';
import AuthGuard from '@/components/auth/AuthGuard';
import NeonButton from '@/components/ui/NeonButton';

const MIN_RECORDING_SECONDS = 30;
const QUESTION_INTERVAL = 30; // seconds between questions
const PREFETCH_LEAD_TIME = 10; // seconds before display to start API call

export default function RecordPage() {
  const router = useRouter();
  const [tooShortWarning, setTooShortWarning] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const { getQuestion, reset: resetQuestions } = useBrainDumpQuestions();

  // Question state
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [questionPhase, setQuestionPhase] = useState<'typing' | 'hold' | null>(null);
  const prefetchedRef = useRef<string | null>(null);
  const prefetchingRef = useRef(false);
  const transcriptRef = useRef(transcript);

  // Keep transcript ref in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  // Start recording on mount
  useEffect(() => {
    setTooShortWarning(false);
    startRecording();
    return () => { stopRecording(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start transcription
  useEffect(() => {
    if (isRecording && isSupported) {
      startListening();
    }
    return () => { stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // === 30-second rhythm: Prefetch question 10s before display ===
  useEffect(() => {
    if (!isRecording) return;
    if (duration < QUESTION_INTERVAL - PREFETCH_LEAD_TIME) return;
    if (duration % QUESTION_INTERVAL !== QUESTION_INTERVAL - PREFETCH_LEAD_TIME) return;
    if (prefetchingRef.current) return;

    prefetchingRef.current = true;
    getQuestion(transcriptRef.current, duration).then(q => {
      prefetchedRef.current = q;
      prefetchingRef.current = false;
    }).catch(() => {
      prefetchingRef.current = false;
    });
  }, [duration, isRecording, getQuestion]);

  // === 30-second rhythm: Display question (stays visible until replaced) ===
  useEffect(() => {
    if (!isRecording) return;
    if (duration < QUESTION_INTERVAL || duration % QUESTION_INTERVAL !== 0) return;

    const question = prefetchedRef.current;
    prefetchedRef.current = null;
    if (!question) return;

    setActiveQuestion(question);
    setQuestionPhase('typing');
    triggerHaptic('light');

    const typingMs = question.length * 67;
    setTimeout(() => setQuestionPhase('hold'), typingMs);
  }, [duration, isRecording]);

  // === Stop recording ===
  const handleStop = useCallback(() => {
    stopRecording();
    stopListening();
  }, [stopRecording, stopListening]);

  // Navigate to processing after recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      if (duration < MIN_RECORDING_SECONDS) {
        setTooShortWarning(true);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('kataru_audio', reader.result as string);
        sessionStorage.setItem('kataru_transcript', transcript);
        router.push('/processing');
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, isRecording, duration, transcript, router]);

  // Reset on re-record
  useEffect(() => {
    if (isRecording) {
      setActiveQuestion(null);
      setQuestionPhase(null);
      prefetchedRef.current = null;
      prefetchingRef.current = false;
      resetQuestions();
    }
  }, [isRecording, resetQuestions]);

  const rotationDeg = duration * 0.5;

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh">
        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'var(--neon-magenta)',
                  boxShadow: '0 0 8px var(--neon-magenta)',
                  animation: 'rec-pulse 1.5s ease infinite',
                }}
              />
              <span
                className="text-[10px] tracking-[2px] uppercase"
                style={{ color: 'var(--neon-magenta)' }}
              >
                RECORDING
              </span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
            >
              <span>&larr;</span> BACK
            </button>
          </div>
        </div>

        {/* Equalizer + Timer + Question */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <CircularEqualizer
            frequencyData={frequencyData}
            size={240}
            rotationDeg={rotationDeg}
          />

          <RecordTimer seconds={duration} />

          <StimulusPrompt
            question={activeQuestion}
            phase={questionPhase}
          />
        </div>

        {/* Transcript */}
        <div className="px-5 mb-4 max-h-32 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          {transcriptionError ? (
            <p className="text-xs text-neon-lime opacity-70 tracking-wide text-center">
              {transcriptionError}
            </p>
          ) : (transcript || interimTranscript) ? (
            <p className="text-xs leading-6 text-hud-white opacity-80 tracking-wide">
              {transcript}
              {interimTranscript && (
                <span className="text-neon-cyan opacity-60">{interimTranscript}</span>
              )}
              <span ref={transcriptEndRef} />
            </p>
          ) : (
            <p className="text-xs text-hud-white-dim tracking-[2px] text-center">
              {isSupported ? 'Listening...' : '文字起こしは処理ページで行います'}
            </p>
          )}
        </div>

        {/* Too short warning */}
        {tooShortWarning && (
          <div className="px-5 mb-4 flex flex-col items-center gap-3">
            <p className="text-xs text-neon-magenta tracking-[1px] text-center">
              もう少し話してみませんか？
            </p>
            <NeonButton
              onClick={() => {
                setTooShortWarning(false);
                startRecording();
                if (isSupported) startListening();
              }}
              className="w-full"
            >
              もう一度録音する
            </NeonButton>
          </div>
        )}

        {/* Controls */}
        <div className="pb-8 px-5">
          {!tooShortWarning && (
            <RecordControls onStop={handleStop} isRecording={isRecording} />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

// Haptic feedback (iOS only)
async function triggerHaptic(style: 'light' | 'medium' | 'heavy') {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const impactMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: impactMap[style] });
  } catch {
    // Haptics not available
  }
}
