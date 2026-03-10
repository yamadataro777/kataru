'use client';

import { useRef, useEffect } from 'react';

const POLL_INTERVAL_MS = 500;

/**
 * Detects "silence" by tracking when transcript stops updating.
 * Uses Web Speech API output (not audio levels) — immune to ambient noise.
 * Returns a ref with accumulated silence in milliseconds (no re-renders).
 */
export default function useSilenceDetector(
  transcript: string,
  interimTranscript: string,
  isRecording: boolean,
): React.MutableRefObject<number> {
  const silenceMsRef = useRef(0);
  const lastTranscriptRef = useRef('');
  const lastInterimRef = useRef('');
  const lastChangeTimeRef = useRef(0);

  // Track transcript changes
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
    }
  }, [transcript, interimTranscript, isRecording]);

  // Poll to accumulate silence duration
  useEffect(() => {
    if (!isRecording) {
      silenceMsRef.current = 0;
      lastChangeTimeRef.current = 0;
      lastTranscriptRef.current = '';
      lastInterimRef.current = '';
      return;
    }

    // Initialize on recording start
    lastChangeTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (lastChangeTimeRef.current === 0) return;
      silenceMsRef.current = Date.now() - lastChangeTimeRef.current;
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      silenceMsRef.current = 0;
    };
  }, [isRecording]);

  return silenceMsRef;
}
