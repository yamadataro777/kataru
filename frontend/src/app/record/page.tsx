'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import SilenceGauge from '@/components/recording/SilenceGauge';
import RecordTimer from '@/components/recording/RecordTimer';
import RecordControls from '@/components/recording/RecordControls';
import QuestionTray from '@/components/recording/StimulusPrompt';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import useAdaptiveIntervention from '@/hooks/useAdaptiveIntervention';
import AuthGuard from '@/components/auth/AuthGuard';
import NeonButton from '@/components/ui/NeonButton';

const MIN_RECORDING_SECONDS = 30;

export default function RecordPage() {
  const router = useRouter();
  const [tooShortWarning, setTooShortWarning] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { activeQuestion, questionPhase, silenceProgress, silenceMessage, onContinue, onLater, onDifferent } = useAdaptiveIntervention(transcript, interimTranscript, isRecording, duration, analyserNode);

  // Haptic feedback on new question
  useEffect(() => {
    if (activeQuestion && questionPhase === 'typing') {
      triggerHaptic('light');
    }
  }, [activeQuestion, questionPhase]);

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/privacy')}
                className="text-hud-white-dim bg-transparent border-0 cursor-pointer opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
              >
                <span>&larr;</span> BACK
              </button>
            </div>
          </div>
        </div>

        {/* Equalizer + Timer + Silence Message */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative" style={{ width: 240, height: 240 }}>
            <CircularEqualizer
              frequencyData={frequencyData}
              size={240}
              rotationDeg={rotationDeg}
            />
            <SilenceGauge progress={silenceProgress} size={240} />
          </div>

          <RecordTimer seconds={duration} />

          {/* Silence message */}
          {silenceMessage && !activeQuestion && (
            <p
              className="text-[11px] text-hud-white tracking-wide text-center"
              style={{
                opacity: 0.35,
                animation: 'breath-fade 3s ease-in-out infinite',
              }}
            >
              {silenceMessage}
            </p>
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
        <div className={`pb-8 px-5 ${activeQuestion ? 'mb-[120px]' : ''}`}>
          {!tooShortWarning && (
            <RecordControls onStop={handleStop} isRecording={isRecording} />
          )}
        </div>

        {/* Question Tray */}
        <QuestionTray
          question={activeQuestion}
          phase={questionPhase}
          onContinue={onContinue}
          onLater={onLater}
          onDifferent={onDifferent}
        />
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
