'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSilenceDetectorOptions {
  threshold?: number;
  silenceDurationMs?: number;
  enabled?: boolean;
}

interface UseSilenceDetectorReturn {
  isSilent: boolean;
  silenceTriggered: boolean;
  speechDetected: boolean;
  resetTrigger: () => void;
}

export default function useSilenceDetector(
  frequencyData: number[],
  options: UseSilenceDetectorOptions = {},
): UseSilenceDetectorReturn {
  const {
    threshold = 0.05,
    silenceDurationMs = 4000,
    enabled = true,
  } = options;

  const [isSilent, setIsSilent] = useState(false);
  const [silenceTriggered, setSilenceTriggered] = useState(false);
  const [speechDetected, setSpeechDetected] = useState(false);

  const silenceStartRef = useRef<number | null>(null);
  const wasSilentRef = useRef(false);
  const hasTriggeredRef = useRef(false);
  const speechDetectedRef = useRef(false);

  // Sync refs via effects (React 19 purity rules)
  const frequencyDataRef = useRef(frequencyData);
  useEffect(() => {
    frequencyDataRef.current = frequencyData;
  }, [frequencyData]);

  const thresholdRef = useRef(threshold);
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  const silenceDurationRef = useRef(silenceDurationMs);
  useEffect(() => {
    silenceDurationRef.current = silenceDurationMs;
  }, [silenceDurationMs]);

  // Polling interval — runs only when enabled
  useEffect(() => {
    if (!enabled) {
      // Reset refs when disabled; state resets happen in the cleanup or next enable cycle
      silenceStartRef.current = null;
      wasSilentRef.current = false;
      hasTriggeredRef.current = false;
      return;
    }

    const intervalId = setInterval(() => {
      const data = frequencyDataRef.current;
      const avg =
        data.length > 0
          ? data.reduce((sum, v) => sum + v, 0) / data.length
          : 0;

      const currentlySilent = avg < thresholdRef.current;

      if (!currentlySilent && !speechDetectedRef.current) {
        speechDetectedRef.current = true;
        setSpeechDetected(true);
      }

      if (currentlySilent !== wasSilentRef.current) {
        wasSilentRef.current = currentlySilent;
        setIsSilent(currentlySilent);

        if (currentlySilent) {
          silenceStartRef.current = Date.now();
          hasTriggeredRef.current = false;
        } else {
          silenceStartRef.current = null;
        }
      }

      if (
        currentlySilent &&
        silenceStartRef.current !== null &&
        !hasTriggeredRef.current
      ) {
        const elapsed = Date.now() - silenceStartRef.current;
        if (elapsed >= silenceDurationRef.current) {
          hasTriggeredRef.current = true;
          setSilenceTriggered(true);
        }
      }
    }, 200);

    return () => clearInterval(intervalId);
  }, [enabled]);

  const resetTrigger = useCallback(() => {
    setSilenceTriggered(false);
    hasTriggeredRef.current = false;
    silenceStartRef.current = null;
    wasSilentRef.current = false;
  }, []);

  return { isSilent, silenceTriggered, speechDetected, resetTrigger };
}
