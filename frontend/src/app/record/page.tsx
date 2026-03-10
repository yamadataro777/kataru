'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const reachedMilestones = useRef<Set<number>>(new Set());
  const milestoneTimerRef = useRef<number | null>(null);

  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { activeQuestion, questionPhase, silenceProgress, silenceMessage, onContinue, onLater, onDifferent } = useAdaptiveIntervention(transcript, interimTranscript, isRecording, duration, analyserNode);

  const energyLevel = useMemo(() => {
    if (frequencyData.length === 0) return 0;
    const activeBins = frequencyData.slice(0, 40);
    const avg = activeBins.reduce((sum, v) => sum + v, 0) / activeBins.length;
    return Math.min(1, avg * 2.25);
  }, [frequencyData]);

  const flowLabel = useMemo(() => {
    if (duration < 15) return 'WARM UP';
    if (duration < 60) return 'FLOW';
    return 'DEEP FLOW';
  }, [duration]);

  const flowMessage = useMemo(() => {
    if (energyLevel > 0.72) return 'いいリズムです。このまま流れに乗ってください';
    if (energyLevel > 0.45) return '思考が広がっています。具体例まで話してみましょう';
    return '最初の一言だけでOK。気楽に続けてください';
  }, [energyLevel]);

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

  // Milestone feedback
  useEffect(() => {
    if (!isRecording) return;

    const milestones: Array<{ second: number; message: string }> = [
      { second: MIN_RECORDING_SECONDS, message: '解析できる長さに到達しました' },
      { second: 60, message: '集中ゾーンに入りました' },
      { second: 120, message: '深掘りモードです。核心に触れましょう' },
    ];

    const reached = milestones.find((m) => duration >= m.second && !reachedMilestones.current.has(m.second));
    if (!reached) return;

    reachedMilestones.current.add(reached.second);
    setMilestoneMessage(reached.message);
    triggerHaptic(reached.second === MIN_RECORDING_SECONDS ? 'medium' : 'heavy');

    if (milestoneTimerRef.current !== null) {
      window.clearTimeout(milestoneTimerRef.current);
    }
    milestoneTimerRef.current = window.setTimeout(() => {
      setMilestoneMessage(null);
      milestoneTimerRef.current = null;
    }, 2200);
  }, [duration, isRecording]);

  useEffect(() => {
    return () => {
      if (milestoneTimerRef.current !== null) {
        window.clearTimeout(milestoneTimerRef.current);
      }
    };
  }, []);

  // === Stop recording ===
  const handleStop = useCallback(() => {
    triggerHaptic(duration >= MIN_RECORDING_SECONDS ? 'heavy' : 'light');
    stopRecording();
    stopListening();
  }, [duration, stopRecording, stopListening]);

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

  const rotationDeg = duration * 0.65;
  const bgCyan = 0.14 + energyLevel * 0.26;
  const bgMagenta = 0.11 + energyLevel * 0.2;

  return (
    <AuthGuard>
      <div
        className="flex flex-col min-h-dvh relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 50% 38%, rgba(0,212,255,${bgCyan}), transparent 42%),
            radial-gradient(circle at 72% 72%, rgba(255,59,122,${bgMagenta}), transparent 46%),
            linear-gradient(180deg, #050810 0%, #0A1020 100%)
          `,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,212,255,0.08), transparent 32%, rgba(255,59,122,0.08))',
            opacity: 0.5 + energyLevel * 0.4,
            animation: 'focus-breath 5.6s ease-in-out infinite',
          }}
        />

        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0 relative z-10">
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

        {/* Equalizer + Timer + Flow Message */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10 px-5">
          <div className="relative" style={{ width: 240, height: 240 }}>
            <CircularEqualizer
              frequencyData={frequencyData}
              size={240}
              rotationDeg={rotationDeg}
              energy={energyLevel}
            />
            <SilenceGauge progress={silenceProgress} isSpeakingNow={energyLevel > 0.15} size={240} />
          </div>

          <RecordTimer seconds={duration} minSeconds={MIN_RECORDING_SECONDS} />

          <div className="min-h-10 flex flex-col items-center justify-center gap-1 text-center">
            {milestoneMessage ? (
              <p
                className="text-[12px] tracking-[1.5px] text-neon-lime"
                style={{
                  textShadow: '0 0 14px rgba(168,255,0,0.55)',
                  animation: 'milestone-burst 0.7s ease-out',
                }}
              >
                {milestoneMessage}
              </p>
            ) : (
              <>
                <p className="text-[10px] tracking-[2px] text-neon-cyan opacity-75">{flowLabel}</p>
                <p
                  className="text-[11px] text-hud-white tracking-wide"
                  style={{ opacity: 0.6 + energyLevel * 0.3 }}
                >
                  {flowMessage}
                </p>
              </>
            )}

            {silenceMessage && !activeQuestion && (
              <p
                className="text-[10px] text-hud-white tracking-wide"
                style={{
                  opacity: 0.35,
                  animation: 'breath-fade 3s ease-in-out infinite',
                }}
              >
                {silenceMessage}
              </p>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div
          className="px-5 mb-4 max-h-32 overflow-y-auto relative z-10"
          style={{
            scrollBehavior: 'smooth',
            maskImage: 'linear-gradient(to top, black 72%, transparent 100%)',
          }}
        >
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
          <div className="px-5 mb-4 flex flex-col items-center gap-3 relative z-10">
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
        <div className={`pb-8 px-5 relative z-10 ${activeQuestion ? 'mb-[120px]' : ''}`}>
          {!tooShortWarning && (
            <RecordControls
              onStop={handleStop}
              isRecording={isRecording}
              seconds={duration}
              minSeconds={MIN_RECORDING_SECONDS}
            />
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
