'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CircularEqualizer from '@/components/recording/CircularEqualizer';
import RecordTimer from '@/components/recording/RecordTimer';
import RecordControls from '@/components/recording/RecordControls';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import useAudioVisualizer from '@/hooks/useAudioVisualizer';
import useTranscription from '@/hooks/useTranscription';
import AuthGuard from '@/components/auth/AuthGuard';
import NeonButton from '@/components/ui/NeonButton';

type InputMode = 'voice' | 'text';

export default function RecordPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [textInput, setTextInput] = useState('');
  const [textSubmitting, setTextSubmitting] = useState(false);
  const { isRecording, startRecording, stopRecording, audioBlob, duration, analyserNode } = useAudioRecorder();
  const frequencyData = useAudioVisualizer(analyserNode);
  const { transcript, interimTranscript, isSupported, error: transcriptionError, startListening, stopListening } = useTranscription();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to latest text
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (inputMode === 'voice') {
      startRecording();
    }
    return () => {
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode]);

  useEffect(() => {
    if (inputMode === 'voice' && isRecording && isSupported) {
      startListening();
    }
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, inputMode]);

  const handleStop = useCallback(() => {
    stopRecording();
    stopListening();
  }, [stopRecording, stopListening]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('kataru_audio', reader.result as string);
        sessionStorage.setItem('kataru_transcript', transcript);
        router.push('/processing');
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, isRecording, transcript, router]);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setTextSubmitting(true);
    // For text mode, store the transcript directly and skip audio upload
    sessionStorage.setItem('kataru_transcript', textInput.trim());
    sessionStorage.removeItem('kataru_audio');
    router.push('/processing');
  };

  const charCount = textInput.length;

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
            {/* Recording Guidance */}
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

            {/* Equalizer */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <CircularEqualizer frequencyData={frequencyData} size={240} />
              <RecordTimer seconds={duration} />
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
                  {isSupported ? 'Listening...' : 'Speech recognition not available in this browser'}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="pb-8 px-5">
              <RecordControls onStop={handleStop} isRecording={isRecording} />
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
