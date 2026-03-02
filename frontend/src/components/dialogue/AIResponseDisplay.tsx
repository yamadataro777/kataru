'use client';

import { useEffect, useRef, useSyncExternalStore, useCallback } from 'react';

interface AIResponseDisplayProps {
  text: string;
  onComplete?: () => void;
}

export default function AIResponseDisplay({ text, onComplete }: AIResponseDisplayProps) {
  const storeRef = useRef({ index: 0, displayed: '', completed: false, listeners: new Set<() => void>() });

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => { storeRef.current.listeners.delete(listener); };
  }, []);

  const getSnapshot = useCallback(() => storeRef.current.displayed, []);

  const displayedText = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const store = storeRef.current;
    store.index = 0;
    store.displayed = '';
    store.completed = false;
    store.listeners.forEach((l) => l());

    const interval = setInterval(() => {
      if (store.index < text.length) {
        store.index++;
        store.displayed = text.slice(0, store.index);
        store.listeners.forEach((l) => l());
      } else {
        clearInterval(interval);
        if (!store.completed) {
          store.completed = true;
          onComplete?.();
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <p
      className="text-sm leading-6 tracking-wide"
      style={{
        color: 'var(--neon-cyan)',
        textShadow: '0 0 8px rgba(0,212,255,0.3)',
      }}
    >
      {displayedText}
      {displayedText.length < text.length && (
        <span
          className="inline-block w-[2px] h-[14px] ml-0.5 align-middle"
          style={{
            background: 'var(--neon-cyan)',
            animation: 'rec-pulse 1s ease infinite',
          }}
        />
      )}
    </p>
  );
}
