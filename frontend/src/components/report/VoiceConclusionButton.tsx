'use client';

import { useState, useRef, useCallback } from 'react';
import { transcribeCoachingAudio } from '@/lib/api';

interface VoiceConclusionButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceConclusionButton({ onTranscript }: VoiceConclusionButtonProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getSupportedMimeType = () => {
    const types = ['audio/mp4', 'audio/wav', 'audio/webm'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const { transcript } = await transcribeCoachingAudio(blob);
          if (transcript) onTranscript(transcript);
        } catch (e) {
          console.error('Voice conclusion transcription failed:', e);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  if (transcribing) {
    return (
      <span
        className="text-[9px] tracking-[2px] text-neon-cyan"
        style={{ animation: 'neon-flicker 1.5s ease infinite' }}
      >
        文字起こし中...
      </span>
    );
  }

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      className="flex items-center gap-1.5 text-[9px] tracking-[1px] px-3 py-1.5 rounded cursor-pointer transition-all"
      style={{
        color: recording ? 'var(--neon-magenta)' : 'var(--hud-white-dim)',
        background: recording ? 'rgba(255,59,122,0.1)' : 'rgba(232,237,245,0.04)',
        border: `1px solid ${recording ? 'rgba(255,59,122,0.3)' : 'rgba(232,237,245,0.12)'}`,
      }}
    >
      <span style={{ fontSize: '12px' }}>{recording ? '\u25A0' : '\u{1F3A4}'}</span>
      {recording ? '停止' : '声で入力'}
    </button>
  );
}
