'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import CircularEqualizer from '@/components/recording/CircularEqualizer';

interface DialogueRecordButtonProps {
  onRecordingComplete: (blob: Blob, transcript: string) => void;
  disabled?: boolean;
}

export default function DialogueRecordButton({
  onRecordingComplete,
  disabled = false,
}: DialogueRecordButtonProps) {
  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, isSupported, startListening, stopListening } = useTranscription();
  const submittedBlobRef = useRef<Blob | null>(null);

  const handleTap = useCallback(async () => {
    if (disabled) return;

    if (state === 'idle') {
      submittedBlobRef.current = null;
      setState('recording');
      await startRecording();
      if (isSupported) startListening();
    } else {
      stopRecording();
      stopListening();
      setState('idle');
    }
  }, [state, disabled, startRecording, stopRecording, isSupported, startListening, stopListening]);

  useEffect(() => {
    if (audioBlob && state === 'idle' && !isRecording && audioBlob !== submittedBlobRef.current) {
      submittedBlobRef.current = audioBlob;
      onRecordingComplete(audioBlob, transcript);
    }
  }, [audioBlob, state, isRecording, onRecordingComplete, transcript]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4">
      {state === 'recording' && (
        <div className="mb-2">
          <CircularEqualizer frequencyData={frequencyData} size={80} />
        </div>
      )}

      <button
        onClick={handleTap}
        disabled={disabled}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          border-2 transition-all duration-300 cursor-pointer
          ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
        `}
        style={{
          borderColor: state === 'recording' ? 'var(--neon-magenta)' : 'var(--neon-cyan)',
          background: state === 'recording'
            ? 'rgba(255,59,122,0.1)'
            : 'rgba(0,212,255,0.05)',
          boxShadow: state === 'recording'
            ? '0 0 20px rgba(255,59,122,0.3), inset 0 0 15px rgba(255,59,122,0.05)'
            : '0 0 20px rgba(0,212,255,0.2), inset 0 0 15px rgba(0,212,255,0.05)',
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
            stroke="var(--neon-cyan)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.4))' }}
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
        ) : (
          <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-70">
            話す
          </span>
        )}
      </div>
    </div>
  );
}
