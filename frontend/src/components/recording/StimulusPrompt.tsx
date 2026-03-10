'use client';

import { useRef, useEffect, useState } from 'react';

interface StimulusPromptProps {
  question: string | null;
  phase: 'typing' | 'hold' | null;
  isIntegration?: boolean;
  isNudge?: boolean;
}

export default function StimulusPrompt({ question, phase, isIntegration = false, isNudge = false }: StimulusPromptProps) {
  const [revealPercent, setRevealPercent] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Typing animation
  useEffect(() => {
    if (phase !== 'typing' || !question) {
      if (phase === 'hold') setRevealPercent(100);
      return;
    }

    setRevealPercent(0);
    const charDuration = 67; // ~15 chars/sec
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

  if (!question || !phase) {
    return <div className="h-12" />;
  }

  const color = isNudge
    ? 'var(--hud-white)'
    : isIntegration ? 'var(--neon-cyan)' : 'var(--neon-lime)';
  const glowColor = isIntegration ? 'rgba(0,212,255,0.3)' : 'rgba(168,255,0,0.3)';

  return (
    <div className="h-12 flex items-center justify-center px-5">
      <span
        className={`font-mono tracking-[1.5px] text-center block ${isNudge ? 'text-[10px]' : 'text-[12px]'}`}
        style={{
          color,
          opacity: isNudge ? 0.5 : 1,
          textShadow: isNudge ? 'none' : `0 0 12px ${glowColor}`,
          clipPath: phase === 'typing' && !isNudge ? `inset(0 ${100 - revealPercent}% 0 0)` : undefined,
        }}
      >
        {question}
      </span>
    </div>
  );
}
