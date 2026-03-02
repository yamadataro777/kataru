'use client';

import { useState, useEffect, useRef } from 'react';

export default function useAudioVisualizer(analyserNode: AnalyserNode | null): number[] {
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(64).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyserNode) {
      setFrequencyData(new Array(64).fill(0));
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      analyserNode.getByteFrequencyData(dataArray);
      const normalized = Array.from(dataArray.slice(0, 64)).map((v) => v / 255);
      setFrequencyData(normalized);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [analyserNode]);

  return frequencyData;
}
