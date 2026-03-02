'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import RecordTimer from '@/components/recording/RecordTimer';
import RecordControls from '@/components/recording/RecordControls';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';

export default function RecordPage() {
  const router = useRouter();
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording && isSupported) {
      startListening();
    }
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleStop = useCallback(() => {
    stopRecording();
    stopListening();
  }, [stopRecording, stopListening]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      // Store the blob in sessionStorage as a data URL for the processing page
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('kataru_audio', reader.result as string);
        sessionStorage.setItem('kataru_transcript', transcript);
        router.push('/processing');
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, isRecording, transcript, router]);

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full bg-neon-magenta"
            style={{
              boxShadow: '0 0 8px var(--neon-magenta)',
              animation: 'rec-pulse 1.5s ease infinite',
            }}
          />
          <span className="text-[10px] tracking-[2px] uppercase text-neon-magenta">
            RECORDING
          </span>
        </div>
      </div>

      {/* Recording Guidance */}
      <div className="px-5 flex-shrink-0">
        <div
          className="rounded border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.03)] px-4 py-3"
        >
          <p className="text-[10px] tracking-[1px] leading-5 text-hud-white opacity-60">
            今抱えている判断や悩みについて、自由に話してみてください
          </p>
          <p className="text-[9px] tracking-[1px] text-neon-cyan opacity-40 mt-1">
            3〜5分がおすすめです
          </p>
        </div>
      </div>

      {/* Equalizer */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <CircularEqualizer frequencyData={frequencyData} size={240} />
        <RecordTimer seconds={duration} />
      </div>

      {/* Transcript */}
      <div className="px-5 mb-4 max-h-24 overflow-y-auto">
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
          </p>
        ) : (
          <p className="text-xs text-hud-white-dim tracking-[2px] text-center">
            {isSupported ? 'Listening...' : 'Speech recognition not available in this browser'}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="pb-8 px-5">
        <RecordControls onStop={handleStop} isRecording={isRecording} />
      </div>
    </div>
  );
}
