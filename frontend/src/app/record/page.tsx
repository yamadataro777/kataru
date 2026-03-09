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

type InputMode = 'voice' | 'text';

const MIN_RECORDING_SECONDS = 30;
const INTEGRATION_ELIGIBLE_SECONDS = 60;
const QUESTION_INTERVAL = 30; // seconds between questions
const PREFETCH_LEAD_TIME = 10; // seconds before display to start API call

export default function RecordPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [textInput, setTextInput] = useState('');
  const [textSubmitting, setTextSubmitting] = useState(false);
  const [tooShortWarning, setTooShortWarning] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const { getQuestion, getIntegrationQuestion, reset: resetQuestions } = useBrainDumpQuestions();

  // Question state
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [questionPhase, setQuestionPhase] = useState<'typing' | 'hold' | 'dissolve' | null>(null);
  const prefetchedRef = useRef<string | null>(null);
  const prefetchingRef = useRef(false);
  const transcriptRef = useRef(transcript);

  // Integration state (inline, no overlay)
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationQuestion, setIntegrationQuestion] = useState<string | null>(null);
  const [showIntegrationButtons, setShowIntegrationButtons] = useState(false);
  const [barHeightMultiplier, setBarHeightMultiplier] = useState(1.0);

  // Keep transcript ref in sync
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  // Start recording on mount
  useEffect(() => {
    if (inputMode === 'voice') {
      setTooShortWarning(false);
      startRecording();
    }
    return () => { stopRecording(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode]);

  // Start transcription
  useEffect(() => {
    if (inputMode === 'voice' && isRecording && isSupported) {
      startListening();
    }
    return () => { stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, inputMode]);

  // === 30-second rhythm: Prefetch question 10s before display ===
  useEffect(() => {
    if (!isRecording || isIntegrating) return;
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
  }, [duration, isRecording, isIntegrating, getQuestion]);

  // === 30-second rhythm: Display question ===
  useEffect(() => {
    if (!isRecording || isIntegrating) return;
    if (duration < QUESTION_INTERVAL || duration % QUESTION_INTERVAL !== 0) return;
    if (activeQuestion !== null) return;

    const question = prefetchedRef.current;
    prefetchedRef.current = null;
    if (!question) return;

    setActiveQuestion(question);
    setQuestionPhase('typing');
    triggerHaptic('light');

    const typingMs = question.length * 67;
    const holdMs = 5000;

    setTimeout(() => setQuestionPhase('hold'), typingMs);
    setTimeout(() => setQuestionPhase('dissolve'), typingMs + holdMs);
    setTimeout(() => {
      setActiveQuestion(null);
      setQuestionPhase(null);
    }, typingMs + holdMs + 500);
  }, [duration, isRecording, isIntegrating, activeQuestion]);

  // === Stop → Integration or finish ===
  const handleStop = useCallback(async () => {
    if (duration >= INTEGRATION_ELIGIBLE_SECONDS && !isIntegrating) {
      setActiveQuestion(null);
      setQuestionPhase(null);
      setIsIntegrating(true);

      // Reduce bar height over 2s
      let step = 0;
      const steps = 20;
      const interval = setInterval(() => {
        step++;
        setBarHeightMultiplier(1.0 - (step / steps) * 0.4);
        if (step >= steps) clearInterval(interval);
      }, 100);

      // Fetch integration question
      const question = await getIntegrationQuestion(transcriptRef.current);
      setIntegrationQuestion(question);
      setQuestionPhase('typing');

      const typingMs = question.length * 67;
      setTimeout(() => {
        setQuestionPhase('hold');
        setTimeout(() => setShowIntegrationButtons(true), 2000);
      }, typingMs);

      triggerHaptic('medium');
      return;
    }

    stopRecording();
    stopListening();
  }, [duration, stopRecording, stopListening, getIntegrationQuestion, isIntegrating]);

  const handleIntegrationComplete = useCallback(() => {
    setIsIntegrating(false);
    setIntegrationQuestion(null);
    setQuestionPhase(null);
    setShowIntegrationButtons(false);
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
      setIsIntegrating(false);
      setIntegrationQuestion(null);
      setShowIntegrationButtons(false);
      setBarHeightMultiplier(1.0);
      prefetchedRef.current = null;
      prefetchingRef.current = false;
      resetQuestions();
    }
  }, [isRecording, resetQuestions]);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setTextSubmitting(true);
    sessionStorage.setItem('kataru_transcript', textInput.trim());
    sessionStorage.removeItem('kataru_audio');
    router.push('/processing');
  };

  const charCount = textInput.length;
  const rotationDeg = duration * 0.5;

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh">
        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: inputMode === 'voice' ? 'var(--neon-magenta)' : 'var(--neon-cyan)',
                  boxShadow: inputMode === 'voice' ? '0 0 8px var(--neon-magenta)' : '0 0 8px var(--neon-cyan)',
                  animation: inputMode === 'voice' ? 'rec-pulse 1.5s ease infinite' : 'none',
                }}
              />
              <span
                className="text-[10px] tracking-[2px] uppercase"
                style={{ color: inputMode === 'voice' ? 'var(--neon-magenta)' : 'var(--neon-cyan)' }}
              >
                {inputMode === 'voice' ? 'RECORDING' : 'TEXT INPUT'}
              </span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
            >
              <span>&larr;</span> BACK
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1">
            {(['voice', 'text'] as InputMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className="flex-1 text-[9px] font-bold tracking-[2px] py-1.5 cursor-pointer transition-all rounded"
                style={{
                  color: inputMode === mode ? (mode === 'voice' ? 'var(--neon-magenta)' : 'var(--neon-cyan)') : 'rgba(232,237,245,0.3)',
                  background: inputMode === mode ? (mode === 'voice' ? 'rgba(255,59,122,0.08)' : 'rgba(0,212,255,0.08)') : 'transparent',
                  border: inputMode === mode ? `1px solid ${mode === 'voice' ? 'rgba(255,59,122,0.3)' : 'rgba(0,212,255,0.3)'}` : '1px solid transparent',
                }}
              >
                {mode === 'voice' ? 'VOICE' : 'TEXT'}
              </button>
            ))}
          </div>
        </div>

        {inputMode === 'voice' ? (
          <>
            {/* Guidance */}
            <div className="px-5 flex-shrink-0">
              <div className="rounded border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)] px-4 py-3">
                <p className="text-[10px] tracking-[1px] leading-5 text-hud-white opacity-60">
                  今抱えている判断や悩みについて、自由に話してみてください
                </p>
                <p className="text-[9px] tracking-[1px] text-neon-cyan opacity-40 mt-1">
                  3〜5分がおすすめです
                </p>
              </div>
            </div>

            {/* Equalizer + Timer + Question */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <CircularEqualizer
                frequencyData={frequencyData}
                size={240}
                rotationDeg={rotationDeg}
                maxBarHeightMultiplier={barHeightMultiplier}
              />

              <RecordTimer seconds={duration} />

              {isIntegrating ? (
                <StimulusPrompt
                  question={integrationQuestion}
                  phase={questionPhase}
                  isIntegration
                />
              ) : (
                <StimulusPrompt
                  question={activeQuestion}
                  phase={questionPhase}
                />
              )}
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

            {/* Integration buttons */}
            {isIntegrating && showIntegrationButtons && (
              <div className="px-5 mb-4 flex flex-col items-center gap-2">
                <p
                  className="text-[9px] tracking-[1px]"
                  style={{ color: 'var(--hud-white)', opacity: 0.3 }}
                >
                  声に出して答えてみてください
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleIntegrationComplete}
                    className="py-2 px-6 rounded text-[9px] tracking-[2px] cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(232,237,245,0.2)',
                      color: 'rgba(232,237,245,0.5)',
                    }}
                  >
                    SKIP
                  </button>
                  <button
                    onClick={handleIntegrationComplete}
                    className="py-2 px-6 rounded text-[9px] tracking-[2px] cursor-pointer"
                    style={{
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.4)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    DONE
                  </button>
                </div>
              </div>
            )}

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
              {!tooShortWarning && !isIntegrating && (
                <RecordControls onStop={handleStop} isRecording={isRecording} />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Text Input Mode */}
            <div className="px-5 mt-2 flex-shrink-0">
              <div className="rounded border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)] px-4 py-3">
                <p className="text-[10px] tracking-[1px] leading-5 text-hud-white opacity-60">
                  考えていることをテキストで入力してください。
                  声を出せない環境でもKataruをお使いいただけます。
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col px-5 mt-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="今抱えている判断や悩みについて、自由に書いてみてください..."
                className="flex-1 min-h-[300px] bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.15)] rounded-lg p-4 text-sm text-hud-white placeholder:text-hud-white-dim tracking-wide leading-7 resize-none focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
              />
              <div className="flex items-center justify-between mt-2 mb-4">
                <span className="text-[9px] text-hud-white-dim tracking-[1px]">
                  {charCount} 文字
                </span>
                <span className="text-[9px] text-neon-cyan opacity-40 tracking-[1px]">
                  200文字以上がおすすめです
                </span>
              </div>
            </div>

            <div className="px-5 pb-8">
              <NeonButton
                onClick={handleTextSubmit}
                disabled={charCount < 50 || textSubmitting}
                className="w-full"
              >
                {textSubmitting ? 'PROCESSING...' : 'ANALYZE'}
              </NeonButton>
              {charCount > 0 && charCount < 50 && (
                <p className="text-[9px] text-neon-magenta opacity-60 text-center mt-2 tracking-[1px]">
                  50文字以上入力してください
                </p>
              )}
            </div>
          </>
        )}
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
