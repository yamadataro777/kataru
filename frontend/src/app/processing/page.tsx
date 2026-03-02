'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, uploadAudio, transcribe, generateReport } from '@/lib/api';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface Step {
  label: string;
  status: StepStatus;
}

export default function ProcessingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([
    { label: 'CREATING SESSION', status: 'pending' },
    { label: 'UPLOADING AUDIO', status: 'pending' },
    { label: 'TRANSCRIBING', status: 'pending' },
    { label: 'GENERATING REPORT', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const process = async () => {
      try {
        // Step 1: Create session
        updateStep(0, 'active');
        const session = await createSession();
        updateStep(0, 'done');

        // Step 2: Upload audio
        updateStep(1, 'active');
        const audioDataUrl = sessionStorage.getItem('kataru_audio');
        if (audioDataUrl) {
          const res = await fetch(audioDataUrl);
          const blob = await res.blob();
          await uploadAudio(session.id, blob);
          sessionStorage.removeItem('kataru_audio');
        }
        updateStep(1, 'done');

        // Step 3: Transcribe
        updateStep(2, 'active');
        const clientTranscript = sessionStorage.getItem('kataru_transcript') || undefined;
        sessionStorage.removeItem('kataru_transcript');
        await transcribe(session.id, clientTranscript);
        updateStep(2, 'done');

        // Step 4: Generate report
        updateStep(3, 'active');
        await generateReport(session.id);
        updateStep(3, 'done');

        // Navigate to results
        setTimeout(() => {
          router.push(`/results?id=${session.id}`);
        }, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Processing failed');
        // Mark current active step as error
        setSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
        );
      }
    };

    process();
  }, [router]);

  const getStepColor = (status: StepStatus) => {
    switch (status) {
      case 'done': return 'var(--neon-lime)';
      case 'active': return 'var(--neon-cyan)';
      case 'error': return 'var(--neon-magenta)';
      default: return 'rgba(232,237,245,0.3)';
    }
  };

  const getStepGlow = (status: StepStatus) => {
    switch (status) {
      case 'done': return '0 0 8px rgba(168,255,0,0.4)';
      case 'active': return '0 0 8px rgba(0,212,255,0.4)';
      case 'error': return '0 0 8px rgba(255,59,122,0.4)';
      default: return 'none';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-8 gap-12">
      <div>
        <h1
          className="text-lg font-bold tracking-[4px] text-neon-cyan text-center"
          style={{
            textShadow: '0 0 20px rgba(0,212,255,0.4)',
            animation: 'neon-flicker 3s ease infinite',
          }}
        >
          PROCESSING
        </h1>
        <p className="text-[10px] tracking-[3px] text-hud-white-dim text-center mt-2 uppercase">
          Analyzing your recording
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-xs">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <span
                className="w-3 h-3 rounded-full block"
                style={{
                  background: getStepColor(step.status),
                  boxShadow: getStepGlow(step.status),
                  animation: step.status === 'active' ? 'rec-pulse 1.5s ease infinite' : 'none',
                }}
              />
              {i < steps.length - 1 && (
                <span
                  className="absolute top-4 left-1/2 -translate-x-1/2 w-[1px] h-6"
                  style={{
                    background: step.status === 'done'
                      ? 'var(--neon-lime)'
                      : 'rgba(0,212,255,0.15)',
                  }}
                />
              )}
            </div>
            <span
              className="text-xs tracking-[2px] font-bold"
              style={{
                color: getStepColor(step.status),
                animation: step.status === 'active' ? 'glitch 0.3s ease infinite' : 'none',
              }}
            >
              {step.label}
            </span>
            {step.status === 'done' && (
              <span className="text-neon-lime text-xs ml-auto">&#10003;</span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="text-center">
          <p className="text-xs text-neon-magenta tracking-[1px] mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-neon-cyan tracking-[2px] bg-transparent border border-neon-cyan rounded px-4 py-2 cursor-pointer"
          >
            BACK TO HOME
          </button>
        </div>
      )}
    </div>
  );
}
