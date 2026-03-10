'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import SilenceGauge from '@/components/recording/SilenceGauge';
import RecordTimer from '@/components/recording/RecordTimer';
import RecordControls from '@/components/recording/RecordControls';
import StimulusPrompt from '@/components/recording/StimulusPrompt';
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

  // Adaptive intervention — nudges (4-7s) + questions (7s+) with context-aware selection
  const { activeQuestion, questionPhase, interventionType, silenceProgress } = useAdaptiveIntervention(transcript, interimTranscript, isRecording, duration, analyserNode);

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
          <div className="relative" style={{ width: 240, height: 240 }}>
            <CircularEqualizer
              frequencyData={frequencyData}
              size={240}
              rotationDeg={rotationDeg}
            />
            <SilenceGauge progress={silenceProgress} size={240} />
          </div>

          <RecordTimer seconds={duration} />

          <StimulusPrompt
            question={activeQuestion}
            phase={questionPhase}
            isNudge={interventionType === 'nudge'}
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
