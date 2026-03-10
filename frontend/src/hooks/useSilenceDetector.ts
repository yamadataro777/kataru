'use client';

import { useRef, useEffect } from 'react';

const SILENCE_THRESHOLD = 15;
const POLL_INTERVAL_MS = 200;

/**
 * Detects silence by polling AnalyserNode frequency data.
 * Returns a ref (not state) to avoid re-renders on every poll cycle.
 * The ref value represents accumulated silence in milliseconds.
 */
export default function useSilenceDetector(
  analyserNode: AnalyserNode | null,
  isRecording: boolean,
): React.MutableRefObject<number> {
  const silenceMsRef = useRef(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!isRecording || !analyserNode) {
      silenceMsRef.current = 0;
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    const interval = setInterval(() => {
      const data = dataArrayRef.current!;
      analyserNode.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += data[i];
      }
      const avg = sum / bufferLength;

      if (avg < SILENCE_THRESHOLD) {
        silenceMsRef.current += POLL_INTERVAL_MS;
      } else {
        silenceMsRef.current = 0;
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      silenceMsRef.current = 0;
    };
  }, [analyserNode, isRecording]);

  return silenceMsRef;
}
