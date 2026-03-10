'use client';

import { useRef, useEffect, useState } from 'react';

interface QuestionTrayProps {
  question: string | null;
  phase: 'typing' | 'hold' | null;
  onContinue: () => void;
  onLater: () => void;
  onDifferent: () => void;
}

export default function QuestionTray({ question, phase, onContinue, onLater, onDifferent }: QuestionTrayProps) {
  const [revealPercent, setRevealPercent] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Typing animation
  useEffect(() => {
    if (phase !== 'typing' || !question) {
      if (phase === 'hold') setRevealPercent(100);
      return;
    }

    setRevealPercent(0);
    const charDuration = 67;
    const totalDuration = question.length * charDuration;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / totalDuration);
      setRevealPercent(progress * 100);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, question]);

  // Slide-up animation
  useEffect(() => {
    if (question && phase) {
      // Small delay for smooth transition
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [question, phase]);

  if (!question || !phase) {
    return null;
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 transition-transform duration-300 ease-out"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      <div
        className="mx-0 px-5 pt-4 pb-5"
        style={{
          background: 'rgba(10,14,26,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,212,255,0.2)',
        }}
      >
        {/* Question text */}
        <p
          className="font-mono tracking-[1.5px] text-[14px] text-center mb-4"
          style={{
            color: 'var(--neon-lime)',
            textShadow: '0 0 12px rgba(168,255,0,0.3)',
            clipPath: phase === 'typing' ? `inset(0 ${100 - revealPercent}% 0 0)` : undefined,
          }}
        >
          {question}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onContinue}
            className="text-[10px] tracking-[1px] px-3 py-1.5 rounded-full cursor-pointer transition-all"
            style={{
              color: 'var(--neon-lime)',
              background: 'rgba(168,255,0,0.08)',
              border: '1px solid rgba(168,255,0,0.25)',
            }}
          >
            この質問で続ける
          </button>
          <button
            onClick={onLater}
            className="text-[10px] tracking-[1px] px-3 py-1.5 rounded-full cursor-pointer transition-all"
            style={{
              color: 'var(--hud-white-dim)',
              background: 'rgba(232,237,245,0.04)',
              border: '1px solid rgba(232,237,245,0.12)',
            }}
          >
            あとで
          </button>
          <button
            onClick={onDifferent}
            className="text-[10px] tracking-[1px] px-3 py-1.5 rounded-full cursor-pointer transition-all"
            style={{
              color: 'var(--hud-white-dim)',
              background: 'rgba(232,237,245,0.04)',
              border: '1px solid rgba(232,237,245,0.12)',
            }}
          >
            別の角度
          </button>
        </div>
      </div>
    </div>
  );
}
