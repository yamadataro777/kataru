'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import type { StageMode } from '../../types/coaching';

interface CoachingRecordButtonProps {
  onRecordingComplete: (blob: Blob, transcript: string) => void;
  disabled?: boolean;
  stageMode: StageMode | null;
}

const MIN_RECORDING_SECONDS = 30;

export function CoachingRecordButton({
  onRecordingComplete,
  disabled = false,
  stageMode,
}: CoachingRecordButtonProps) {
  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const [tooShortWarning, setTooShortWarning] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } =
    useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, isSupported, startListening, stopListening } = useTranscription();
  const submittedBlobRef = useRef<Blob | null>(null);
  const stoppedDurationRef = useRef(0);

  // Disable when no mode is selected (stage 1 requirement)
  const isDisabled = disabled || stageMode === null;

  const handleTap = useCallback(async () => {
    if (isDisabled) return;

    if (state === 'idle') {
      submittedBlobRef.current = null;
      setTooShortWarning(false);
      setState('recording');
      await startRecording();
      if (isSupported) startListening();
    } else {
      stoppedDurationRef.current = duration;
      if (duration < MIN_RECORDING_SECONDS) {
        stopRecording();
        stopListening();
        setState('idle');
        setTooShortWarning(true);
        return;
      }
      stopRecording();
      stopListening();
      setState('idle');
    }
  }, [state, isDisabled, duration, startRecording, stopRecording, isSupported, startListening, stopListening]);

  useEffect(() => {
    if (audioBlob && state === 'idle' && !isRecording && audioBlob !== submittedBlobRef.current && stoppedDurationRef.current >= MIN_RECORDING_SECONDS) {
      submittedBlobRef.current = audioBlob;
      onRecordingComplete(audioBlob, transcript);
    }
  }, [audioBlob, state, isRecording, onRecordingComplete, transcript]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Mode-specific display
  const modeLabel = stageMode === 'logical' ? '論理' : stageMode === 'emotional' ? '感情' : null;
  const modeColor = stageMode === 'logical' ? '#00D4FF' : stageMode === 'emotional' ? '#FF3B7A' : '#00D4FF';

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4">
      {state === 'recording' && (
        <div className="mb-2">
          <CircularEqualizer frequencyData={frequencyData} size={80} />
        </div>
      )}

      {/* Mode badge shown while recording */}
      {state === 'recording' && modeLabel && (
        <div
          className="px-2 py-0.5 rounded font-mono text-[9px] tracking-widest font-bold mb-1"
          style={{
            background: `${modeColor}18`,
            border: `1px solid ${modeColor}40`,
            color: modeColor,
          }}
        >
          {modeLabel}モード
        </div>
      )}

      <button
        onClick={handleTap}
        disabled={isDisabled}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          border-2 transition-all duration-300 cursor-pointer
          ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
        `}
        style={{
          borderColor: state === 'recording' ? 'var(--neon-magenta)' : modeColor,
          background:
            state === 'recording'
              ? 'rgba(255,59,122,0.1)'
              : `${modeColor}0D`,
          boxShadow:
            state === 'recording'
              ? '0 0 20px rgba(255,59,122,0.3), inset 0 0 15px rgba(255,59,122,0.05)'
              : `0 0 20px ${modeColor}33, inset 0 0 15px ${modeColor}0D`,
        }}
      >
        {state === 'recording' && (
          <span
            className="absolute inset-[-6px] rounded-full pointer-events-none"
            style={{
              border: '1px dashed rgba(255,59,122,0.4)',
              animation: 'rotate-ring 10s linear infinite',
            }}
          />
        )}

        {state === 'idle' ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={modeColor}
            strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 6px ${modeColor}66)` }}
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <span
            className="w-5 h-5 rounded-sm"
            style={{
              background: 'var(--neon-magenta)',
              boxShadow: '0 0 8px rgba(255,59,122,0.5)',
            }}
          />
        )}
      </button>

      <div className="flex flex-col items-center gap-1">
        {state === 'recording' ? (
          <>
            <span
              className="text-[10px] tracking-[2px] text-neon-magenta"
              style={{
                textShadow: '0 0 8px rgba(255,59,122,0.3)',
                animation: 'rec-pulse 1.5s ease infinite',
              }}
            >
              録音中...
            </span>
            <span className="text-[11px] tracking-[2px] text-hud-white-dim">
              {formatTime(duration)}
            </span>
          </>
        ) : tooShortWarning ? (
          <span className="text-[10px] tracking-[2px] text-neon-magenta font-mono">
            30秒以上録音してください
          </span>
        ) : stageMode === null ? (
          <span className="text-[10px] tracking-[2px] text-gray-600 font-mono">
            モードを選択してください
          </span>
        ) : (
          <span className="text-[10px] tracking-[2px] opacity-70 font-mono" style={{ color: modeColor }}>
            話す
          </span>
        )}
      </div>
    </div>
  );
}
