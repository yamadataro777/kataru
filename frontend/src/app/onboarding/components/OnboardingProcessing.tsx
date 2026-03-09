'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSession, uploadAudio, transcribe, generateReport } from '@/lib/api';

type ProcessingStep = 'saving' | 'transcribing' | 'analyzing' | 'done' | 'error';

interface OnboardingProcessingProps {
  audioBlob: Blob;
  clientTranscript: string;
  onboardingType: 'thinking' | 'goal' | 'emotion';
  accentColor: 'cyan' | 'magenta' | 'lime';
  onComplete: (sessionId: string, report: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

const stepLabels: Record<ProcessingStep, string> = {
  saving: '保存中...',
  transcribing: '文字起こし中...',
  analyzing: '分析中...',
  done: '完了',
  error: 'エラー',
};

const colorVars = {
  cyan: 'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  lime: 'var(--neon-lime)',
};

export default function OnboardingProcessing({
  audioBlob,
  clientTranscript,
  onboardingType,
  accentColor,
  onComplete,
  onError,
}: OnboardingProcessingProps) {
  const [step, setStep] = useState<ProcessingStep>('saving');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const process = useCallback(async () => {
    try {
      // Step 1: Create session
      setStep('saving');
      const session = await createSession();

      // Step 2: Upload audio
      await uploadAudio(session.id, audioBlob);

      // Step 3: Transcribe
      setStep('transcribing');
      await transcribe(session.id, clientTranscript || undefined);

      // Step 4: Generate onboarding report
      setStep('analyzing');
      const report = await generateReport(session.id, onboardingType) as Record<string, unknown>;

      setStep('done');
      onComplete(session.id, report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '処理中にエラーが発生しました';
      setErrorMsg(msg);
      setStep('error');
      onError(msg);
    }
  }, [audioBlob, clientTranscript, onboardingType, onComplete, onError]);

  useEffect(() => {
    process();
  }, [process]);

  const accentVar = colorVars[accentColor];
  const steps: ProcessingStep[] = ['saving', 'transcribing', 'analyzing'];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">
      {/* Spinning indicator */}
      <div
        className="w-16 h-16 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${accentVar}44`, borderTopColor: accentVar }}
      />

      {/* Step indicators */}
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {steps.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex || step === 'done';
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0"
                style={{
                  borderColor: isDone ? accentVar : isActive ? accentVar : 'rgba(232,237,245,0.15)',
                  color: isDone || isActive ? accentVar : 'var(--white-dim)',
                  background: isDone ? `${accentVar}15` : 'transparent',
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className="text-xs tracking-[1px]"
                style={{
                  color: isActive ? accentVar : isDone ? 'var(--white-dim)' : 'rgba(232,237,245,0.3)',
                  fontFamily: 'sans-serif',
                }}
              >
                {stepLabels[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {step === 'error' && errorMsg && (
        <div className="text-center">
          <p className="text-xs text-neon-magenta mb-4" style={{ fontFamily: 'sans-serif' }}>
            {errorMsg}
          </p>
          <button
            onClick={() => {
              setErrorMsg(null);
              process();
            }}
            className="text-xs tracking-[2px] px-4 py-2 border rounded"
            style={{ borderColor: accentVar, color: accentVar }}
          >
            RETRY
          </button>
        </div>
      )}
    </div>
  );
}
