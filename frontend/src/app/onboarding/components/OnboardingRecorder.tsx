'use client';

import { useState, useEffect, useCallback } from 'react';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import RecordTimer from '@/components/recording/RecordTimer';

const MIN_DURATION = 15;
const SOFT_STOP_DURATION = 60;
const HARD_STOP_DURATION = 90;

interface OnboardingRecorderProps {
  accentColor: 'cyan' | 'magenta' | 'lime';
  onComplete: (audioBlob: Blob, transcript: string) => void;
}

const colorVars = {
  cyan: 'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime: 'var(--neon-lime)',
};

export default function OnboardingRecorder({ accentColor, onComplete }: OnboardingRecorderProps) {
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, startListening, stopListening, isSupported: speechSupported } = useTranscription();

  const [hasStarted, setHasStarted] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // Start recording
  const handleStart = useCallback(async () => {
    setHasStarted(true);
    setTooShort(false);
    await startRecording();
    if (speechSupported) {
      startListening();
    }
  }, [startRecording, startListening, speechSupported]);

  // Stop recording
  const handleStop = useCallback(() => {
    if (duration < MIN_DURATION) {
      setTooShort(true);
      return;
    }
    stopRecording();
    stopListening();
  }, [duration, stopRecording, stopListening]);

  // Duration-based hints
  useEffect(() => {
    if (!isRecording) return;
    if (duration >= HARD_STOP_DURATION) {
      setHint('十分話せました');
      setPulsing(true);
    } else if (duration >= SOFT_STOP_DURATION) {
      setHint('いい感じです。止めたくなったらストップ');
      setPulsing(false);
    } else {
      setHint(null);
      setPulsing(false);
    }
  }, [duration, isRecording]);

  // When recording stops and we have a blob, complete
  useEffect(() => {
    if (!isRecording && audioBlob && hasStarted) {
      const finalTranscript = transcript + interimTranscript;
      onComplete(audioBlob, finalTranscript);
    }
  }, [isRecording, audioBlob, hasStarted, transcript, interimTranscript, onComplete]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStarted) {
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentVar = colorVars[accentColor];

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      {/* Equalizer */}
      <div className="relative">
        <CircularEqualizer frequencyData={frequencyData} size={180} />
      </div>

      {/* Timer */}
      <RecordTimer seconds={duration} />

      {/* Too short warning */}
      {tooShort && (
        <p
          className="text-xs tracking-wide text-center"
          style={{ color: 'var(--neon-magenta)', fontFamily: 'sans-serif' }}
        >
          もう少し話してみてください（あと{MIN_DURATION - duration}秒）
        </p>
      )}

      {/* Hint */}
      {hint && !tooShort && (
        <p
          className="text-xs tracking-wide text-center"
          style={{ color: 'var(--neon-lime)', fontFamily: 'sans-serif' }}
        >
          {hint}
        </p>
      )}

      {/* Live transcript preview */}
      {(transcript || interimTranscript) && (
        <div
          className="w-full max-h-16 overflow-hidden text-[11px] leading-relaxed text-center px-4"
          style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif' }}
        >
          <span>{transcript}</span>
          <span style={{ opacity: 0.5 }}>{interimTranscript}</span>
        </div>
      )}

      {/* Stop button */}
      {isRecording && (
        <button
          onClick={handleStop}
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: accentVar,
            boxShadow: pulsing
              ? `0 0 20px ${accentVar}, 0 0 40px ${accentVar}`
              : `0 0 10px ${accentVar}66`,
            animation: pulsing ? 'pulse-glow 1.5s ease-in-out infinite' : undefined,
          }}
        >
          <div
            className="w-6 h-6 rounded-sm"
            style={{ background: accentVar }}
          />
        </button>
      )}

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px ${accentVar}66, 0 0 20px ${accentVar}33; }
          50% { box-shadow: 0 0 25px ${accentVar}, 0 0 50px ${accentVar}88; }
        }
      `}</style>
    </div>
  );
}
