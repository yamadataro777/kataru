'use client';

import { useRef, useEffect } from 'react';

const POLL_INTERVAL_MS = 500;
// Audio-level threshold for fallback mode (iOS).
// Higher value = less sensitive to ambient noise. Range 0-255.
const AUDIO_SILENCE_THRESHOLD = 20;

/**
 * Hybrid silence detector:
 * - Primary: tracks when Web Speech API transcript stops updating (immune to ambient noise)
 * - Fallback: if transcript never arrives (iOS WKWebView), uses AnalyserNode audio levels
 *
 * Returns a ref with accumulated silence in milliseconds (no re-renders).
 */
export default function useSilenceDetector(
  transcript: string,
  interimTranscript: string,
  isRecording: boolean,
  analyserNode: AnalyserNode | null,
): React.MutableRefObject<number> {
  const silenceMsRef = useRef(0);
  const lastChangeTimeRef = useRef(0);
  const lastTranscriptRef = useRef('');
  const lastInterimRef = useRef('');
  // Track whether transcript has ever received any data
  const transcriptEverActiveRef = useRef(false);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Track transcript changes (primary mode)
  useEffect(() => {
    if (!isRecording) return;

    if (
      transcript !== lastTranscriptRef.current ||
      interimTranscript !== lastInterimRef.current
    ) {
      lastTranscriptRef.current = transcript;
      lastInterimRef.current = interimTranscript;
      lastChangeTimeRef.current = Date.now();
      silenceMsRef.current = 0;
      // Mark that Web Speech API is working
      if (transcript.length > 0 || interimTranscript.length > 0) {
        transcriptEverActiveRef.current = true;
      }
    }
  }, [transcript, interimTranscript, isRecording]);

  // Poll to accumulate silence duration
  useEffect(() => {
    if (!isRecording) {
      silenceMsRef.current = 0;
      lastChangeTimeRef.current = 0;
      lastTranscriptRef.current = '';
      lastInterimRef.current = '';
      transcriptEverActiveRef.current = false;
      dataArrayRef.current = null;
      return;
    }

    lastChangeTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (transcriptEverActiveRef.current) {
        // === Transcript mode: silence = time since last transcript update ===
        if (lastChangeTimeRef.current === 0) return;
        silenceMsRef.current = Date.now() - lastChangeTimeRef.current;
      } else if (analyserNode) {
        // === Audio fallback mode (iOS): silence = low audio level ===
        const bufferLength = analyserNode.frequencyBinCount;
        if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
          dataArrayRef.current = new Uint8Array(bufferLength);
        }
        analyserNode.getByteFrequencyData(dataArrayRef.current);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArrayRef.current[i];
        }
        const avg = sum / bufferLength;

        if (avg < AUDIO_SILENCE_THRESHOLD) {
          silenceMsRef.current += POLL_INTERVAL_MS;
        } else {
          silenceMsRef.current = 0;
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      silenceMsRef.current = 0;
    };
  }, [isRecording, analyserNode]);

  return silenceMsRef;
}
