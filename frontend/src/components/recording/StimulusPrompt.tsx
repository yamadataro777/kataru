'use client';

import { useRef, useEffect, useState } from 'react';

interface StimulusPromptProps {
  question: string | null;
  visible: boolean;
  loading?: boolean;
}

export default function StimulusPrompt({ question, visible, loading }: StimulusPromptProps) {
  if (loading) {
    return (
      <div className="h-10 flex items-center justify-center px-5">
        <div
          className="w-full rounded px-4 py-2 text-center"
          style={{
            background: 'rgba(16,22,42,0.5)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--neon-lime)',
                  opacity: 0.6,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
        </div>
      </div>
    );
  }

  if (!question) {
    return <div className="h-10" />;
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
          }}
        >
          {question}
        </p>
      </div>
    </div>
  );
}
