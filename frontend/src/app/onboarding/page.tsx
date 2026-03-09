'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NeonButton from '@/components/ui/NeonButton';
import HudCorners from '@/components/ui/HudCorners';
import OnboardingRecorder from './components/OnboardingRecorder';
import OnboardingProcessing from './components/OnboardingProcessing';
import OnboardingResult from './components/OnboardingResult';

// --- State Machine ---

type Phase =
  | 'WELCOME'
  | 'SESSION_1_INTRO' | 'SESSION_1_RECORD' | 'SESSION_1_PROCESSING' | 'SESSION_1_RESULT'
  | 'SESSION_2_INTRO' | 'SESSION_2_RECORD' | 'SESSION_2_PROCESSING' | 'SESSION_2_RESULT'
  | 'SESSION_3_INTRO' | 'SESSION_3_RECORD' | 'SESSION_3_PROCESSING' | 'SESSION_3_RESULT'
  | 'COMPLETION';

interface SessionData {
  sessionId: string | null;
  audioBlob: Blob | null;
  transcript: string;
  report: Record<string, unknown> | null;
  title: string;
}

interface OnboardingProgress {
  currentPhase: Phase;
  session1Id: string | null;
  session2Id: string | null;
  session3Id: string | null;
}

const PROGRESS_KEY = 'kataru_onboarding_progress';
const COMPLETED_KEY = 'kataru_onboarding_completed';

function loadProgress(): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProgress(progress: OnboardingProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function getSessionNumber(phase: Phase): number {
  if (phase.startsWith('SESSION_1') || phase === 'WELCOME') return 1;
  if (phase.startsWith('SESSION_2')) return 2;
  if (phase.startsWith('SESSION_3') || phase === 'COMPLETION') return 3;
  return 1;
}

// --- Progress Indicator ---

function ProgressIndicator({ currentSession }: { currentSession: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {[1, 2, 3].map((s, i) => {
        const isDone = s < currentSession;
        const isActive = s === currentSession;
        const color = isDone ? 'var(--neon-lime)' : isActive
          ? s === 1 ? 'var(--neon-cyan)' : s === 2 ? 'var(--neon-magenta)' : 'var(--neon-lime)'
          : 'rgba(232,237,245,0.2)';
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border flex items-center justify-center"
              style={{
                borderColor: color,
                background: isDone || isActive ? `${color}22` : 'transparent',
                boxShadow: isDone || isActive ? `0 0 6px ${color}66` : 'none',
              }}
            >
              {isDone && (
                <span className="text-[8px]" style={{ color }}>✓</span>
              )}
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              )}
            </div>
            {i < 2 && (
              <div
                className="w-8 h-[1px]"
                style={{ background: isDone ? 'var(--neon-lime)' : 'rgba(232,237,245,0.15)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Welcome Screen ---

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div className="relative mb-8" style={{ animation: 'glitch-in 0.6s ease-out' }}>
        <div className="relative p-6">
          <HudCorners color="cyan" />
          <div
            className="text-5xl font-bold tracking-[6px] text-neon-cyan"
            style={{ textShadow: '0 0 30px rgba(0,212,255,0.4)', animation: 'logo-pulse 3s ease-in-out infinite' }}
          >
            K
          </div>
        </div>
      </div>

      <h1
        className="text-xl font-bold tracking-[3px] mb-3"
        style={{ animation: 'glitch-in 0.5s ease-out 0.15s both' }}
      >
        声に出すと、思考が動き出す
      </h1>

      <p
        className="text-xs leading-relaxed mb-2"
        style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.25s both' }}
      >
        3つのミニセッションで体験してみましょう。
        <br />
        合計5〜7分で完了します。
      </p>

      <div className="mt-8 w-full" style={{ animation: 'glitch-in 0.5s ease-out 0.4s both' }}>
        <NeonButton variant="cyan" onClick={onStart} className="w-full">
          始める
        </NeonButton>
      </div>
    </div>
  );
}

// --- Session Intros ---

interface SessionIntroProps {
  sessionNumber: number;
  onStart: () => void;
}

function Session1Intro({ onStart }: SessionIntroProps) {
  return (
    <div className="flex flex-col justify-center flex-1 px-6">
      <p
        className="label text-neon-cyan mb-6"
        style={{ animation: 'glitch-in 0.4s ease-out' }}
      >
        SESSION 01 / 03
      </p>

      <h2
        className="text-xl font-bold tracking-[2px] mb-4"
        style={{ animation: 'glitch-in 0.5s ease-out 0.1s both' }}
      >
        最近、頭の中にあること
      </h2>

      <p
        className="text-xs leading-[1.8] mb-8"
        style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.2s both' }}
      >
        仕事のこと、週末の予定、
        <br />
        気になっていたアイデア——
        <br />
        なんでも構いません。
        <br />
        頭に浮かんでいることを、
        <br />
        そのまま声にしてみてください。
      </p>

      <p
        className="text-[10px] tracking-[1px] mb-8"
        style={{ color: 'var(--white-dim)', animation: 'glitch-in 0.5s ease-out 0.3s both' }}
      >
        60秒くらいでOK
      </p>

      <div style={{ animation: 'glitch-in 0.5s ease-out 0.4s both' }}>
        <NeonButton variant="cyan" onClick={onStart} className="w-full">
          話してみる
        </NeonButton>
      </div>
    </div>
  );
}

function Session2Intro({ onStart }: SessionIntroProps) {
  return (
    <div className="flex flex-col justify-center flex-1 px-6">
      <p
        className="label text-neon-magenta mb-4"
        style={{ animation: 'glitch-in 0.4s ease-out' }}
      >
        SESSION 02 / 03
      </p>

      <p
        className="text-[11px] mb-6"
        style={{ color: 'var(--neon-cyan)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.05s both' }}
      >
        思考が整理できましたね。
      </p>

      <h2
        className="text-xl font-bold tracking-[2px] mb-4"
        style={{ animation: 'glitch-in 0.5s ease-out 0.1s both' }}
      >
        叶えたいこと、ありますか？
      </h2>

      <p
        className="text-xs leading-[1.8] mb-6"
        style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.2s both' }}
      >
        「こうなりたい」「これを実現したい」
        <br />
        ——漠然とした願望でも大丈夫。
        <br />
        具体的でなくていいので、
        <br />
        声に出してみてください。
      </p>

      <p
        className="text-[10px] tracking-[1px] mb-8"
        style={{ color: 'var(--white-dim)', opacity: 0.3, fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.3s both' }}
      >
        例: 起業したい、もっと自由になりたい
      </p>

      <div style={{ animation: 'glitch-in 0.5s ease-out 0.4s both' }}>
        <NeonButton variant="magenta" onClick={onStart} className="w-full">
          話してみる
        </NeonButton>
      </div>
    </div>
  );
}

function Session3Intro({ onStart }: SessionIntroProps) {
  return (
    <div className="flex flex-col justify-center flex-1 px-6">
      <p
        className="label text-neon-lime mb-4"
        style={{ animation: 'glitch-in 0.4s ease-out' }}
      >
        SESSION 03 / 03
      </p>

      <p
        className="text-[11px] mb-6"
        style={{ color: 'var(--neon-magenta)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.05s both' }}
      >
        目標が明確になりましたね。最後は、少しだけ深く。
      </p>

      <h2
        className="text-xl font-bold tracking-[2px] mb-4"
        style={{ animation: 'glitch-in 0.5s ease-out 0.1s both' }}
      >
        最近、心が動いた瞬間
      </h2>

      <p
        className="text-xs leading-[1.8] mb-8"
        style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.2s both' }}
      >
        嬉しかったこと、モヤモヤしたこと、
        <br />
        なぜか気になっていること——
        <br />
        感情について、声にしてみてください。
        <br />
        正解はありません。
      </p>

      <div style={{ animation: 'glitch-in 0.5s ease-out 0.4s both' }}>
        <NeonButton variant="lime" onClick={onStart} className="w-full">
          話してみる
        </NeonButton>
      </div>
    </div>
  );
}

// --- Completion Screen ---

function CompletionScreen({ sessions, onFinish }: { sessions: SessionData[]; onFinish: () => void }) {
  const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-lime)'];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div className="relative mb-8" style={{ animation: 'glitch-in 0.6s ease-out' }}>
        <div className="relative p-6">
          <HudCorners color="cyan" />
          <div
            className="text-5xl font-bold tracking-[6px] text-neon-cyan"
            style={{ textShadow: '0 0 30px rgba(0,212,255,0.4)' }}
          >
            K
          </div>
        </div>
      </div>

      <h2
        className="text-lg font-bold tracking-[2px] mb-6"
        style={{ animation: 'glitch-in 0.5s ease-out 0.15s both' }}
      >
        3つのセッションが完了しました
      </h2>

      <div className="flex flex-col gap-3 w-full mb-8" style={{ animation: 'glitch-in 0.5s ease-out 0.25s both' }}>
        {sessions.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(232,237,245,0.04)', border: `1px solid ${colors[i]}22` }}
          >
            <span
              className="text-xs font-bold tracking-[2px]"
              style={{ color: colors[i], textShadow: `0 0 8px ${colors[i]}44`, minWidth: 24 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-sm flex-1 text-left" style={{ fontFamily: 'sans-serif' }}>
              {s.title || `Session ${i + 1}`}
            </span>
            <span style={{ color: colors[i] }}>✓</span>
          </div>
        ))}
      </div>

      <p
        className="text-xs mb-8 leading-relaxed"
        style={{ color: 'var(--white-dim)', fontFamily: 'sans-serif', animation: 'glitch-in 0.5s ease-out 0.35s both' }}
      >
        これらのセッションは保存されました。
        <br />
        いつでも振り返ることができます。
      </p>

      <div className="w-full" style={{ animation: 'glitch-in 0.5s ease-out 0.45s both' }}>
        <NeonButton variant="cyan" onClick={onFinish} className="w-full">
          ホームへ
        </NeonButton>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('WELCOME');
  const [sessions, setSessions] = useState<SessionData[]>([
    { sessionId: null, audioBlob: null, transcript: '', report: null, title: '' },
    { sessionId: null, audioBlob: null, transcript: '', report: null, title: '' },
    { sessionId: null, audioBlob: null, transcript: '', report: null, title: '' },
  ]);

  // Load saved progress on mount
  useEffect(() => {
    const progress = loadProgress();
    if (progress) {
      // Resume from last completed session's result or next intro
      const p = progress.currentPhase;
      // Only resume to intro/result phases (not mid-recording/processing)
      if (p.endsWith('_INTRO') || p.endsWith('_RESULT') || p === 'COMPLETION' || p === 'WELCOME') {
        setPhase(p);
      } else {
        // If was in recording/processing, go back to intro of that session
        const sessionNum = getSessionNumber(p);
        setPhase(`SESSION_${sessionNum}_INTRO` as Phase);
      }
    }
  }, []);

  // Save progress on phase change
  useEffect(() => {
    if (phase === 'WELCOME') return;
    saveProgress({
      currentPhase: phase,
      session1Id: sessions[0].sessionId,
      session2Id: sessions[1].sessionId,
      session3Id: sessions[2].sessionId,
    });
  }, [phase, sessions]);

  const updateSession = useCallback((index: number, data: Partial<SessionData>) => {
    setSessions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...data };
      return next;
    });
  }, []);

  const handleRecordComplete = useCallback((sessionIndex: number, audioBlob: Blob, transcript: string) => {
    updateSession(sessionIndex, { audioBlob, transcript });
    setPhase(`SESSION_${sessionIndex + 1}_PROCESSING` as Phase);
  }, [updateSession]);

  const handleProcessingComplete = useCallback((sessionIndex: number, sessionId: string, report: Record<string, unknown>) => {
    const title = (report.title as string) || '';
    updateSession(sessionIndex, { sessionId, report, title });
    setPhase(`SESSION_${sessionIndex + 1}_RESULT` as Phase);
  }, [updateSession]);

  const handleProcessingError = useCallback((sessionIndex: number, _error: string) => {
    // Error is displayed inline in OnboardingProcessing with retry
    void sessionIndex;
    void _error;
  }, []);

  const handleFinish = useCallback(() => {
    localStorage.setItem(COMPLETED_KEY, 'true');
    localStorage.removeItem(PROGRESS_KEY);
    router.replace('/');
  }, [router]);

  const sessionNumber = getSessionNumber(phase);
  const sessionConfigs: Array<{
    type: 'thinking' | 'goal' | 'emotion';
    color: 'cyan' | 'magenta' | 'lime';
  }> = [
    { type: 'thinking', color: 'cyan' },
    { type: 'goal', color: 'magenta' },
    { type: 'emotion', color: 'lime' },
  ];

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Progress indicator (hidden on welcome/completion) */}
      {phase !== 'WELCOME' && phase !== 'COMPLETION' && (
        <div className="pt-12 px-6">
          <ProgressIndicator currentSession={sessionNumber} />
        </div>
      )}

      {/* Phase rendering */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {phase === 'WELCOME' && (
          <WelcomeScreen onStart={() => setPhase('SESSION_1_INTRO')} />
        )}

        {phase === 'SESSION_1_INTRO' && (
          <Session1Intro sessionNumber={1} onStart={() => setPhase('SESSION_1_RECORD')} />
        )}
        {phase === 'SESSION_2_INTRO' && (
          <Session2Intro sessionNumber={2} onStart={() => setPhase('SESSION_2_RECORD')} />
        )}
        {phase === 'SESSION_3_INTRO' && (
          <Session3Intro sessionNumber={3} onStart={() => setPhase('SESSION_3_RECORD')} />
        )}

        {/* Recording phases */}
        {[1, 2, 3].map(n => {
          const config = sessionConfigs[n - 1];
          return phase === `SESSION_${n}_RECORD` ? (
            <OnboardingRecorder
              key={`record-${n}`}
              accentColor={config.color}
              onComplete={(blob, transcript) => handleRecordComplete(n - 1, blob, transcript)}
            />
          ) : null;
        })}

        {/* Processing phases */}
        {[1, 2, 3].map(n => {
          const config = sessionConfigs[n - 1];
          const session = sessions[n - 1];
          return phase === `SESSION_${n}_PROCESSING` && session.audioBlob ? (
            <OnboardingProcessing
              key={`process-${n}`}
              audioBlob={session.audioBlob}
              clientTranscript={session.transcript}
              onboardingType={config.type}
              accentColor={config.color}
              onComplete={(id, report) => handleProcessingComplete(n - 1, id, report)}
              onError={(err) => handleProcessingError(n - 1, err)}
            />
          ) : null;
        })}

        {/* Result phases */}
        {[1, 2, 3].map(n => {
          const config = sessionConfigs[n - 1];
          const session = sessions[n - 1];
          return phase === `SESSION_${n}_RESULT` && session.report ? (
            <OnboardingResult
              key={`result-${n}`}
              type={config.type}
              report={session.report}
              isLast={n === 3}
              onNext={() => {
                if (n < 3) {
                  setPhase(`SESSION_${n + 1}_INTRO` as Phase);
                } else {
                  setPhase('COMPLETION');
                }
              }}
            />
          ) : null;
        })}

        {phase === 'COMPLETION' && (
          <CompletionScreen sessions={sessions} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
