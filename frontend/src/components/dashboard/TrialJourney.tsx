'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionPhase, type SessionPhase } from '@/lib/session-tracker';
import GlassCard from '@/components/ui/GlassCard';

const MILESTONES: {
  phase: SessionPhase;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    phase: 'intro',
    label: '基本分析',
    description: '要約・感情分析・トピック抽出',
    icon: '01',
  },
  {
    phase: 'teaser',
    label: '深掘りの予兆',
    description: '有料機能のプレビュー',
    icon: '02',
  },
  {
    phase: 'full_preview',
    label: '詳細レポート',
    description: 'フルレポートを体験',
    icon: '03',
  },
  {
    phase: 'dialogue_preview',
    label: 'AI対話',
    description: '対話モードを体験',
    icon: '04',
  },
  {
    phase: 'exhausted',
    label: '全機能体験済',
    description: 'アップグレードで無制限に',
    icon: '05',
  },
];

const PHASE_ORDER: SessionPhase[] = [
  'intro',
  'teaser',
  'full_preview',
  'dialogue_preview',
  'exhausted',
];

export default function TrialJourney() {
  const router = useRouter();
  const { profile } = useAuth();

  const plan = profile?.plan || 'free';
  if (plan !== 'free') return null;

  const freeSessionsUsed = profile?.free_sessions_used || 0;
  const currentPhase = getSessionPhase(freeSessionsUsed);
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const isExhausted = currentPhase === 'exhausted';

  // Next unlock info
  const nextMilestone =
    currentIndex < MILESTONES.length - 1 ? MILESTONES[currentIndex + 1] : null;

  return (
    <GlassCard className="p-4" variant="cyan">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[9px] font-bold tracking-[2px] text-neon-cyan"
          style={{ textShadow: '0 0 8px rgba(0,212,255,0.3)' }}
        >
          TRIAL JOURNEY
        </span>
        <span className="text-[9px] tracking-[1px] text-hud-white-dim">
          {freeSessionsUsed} / 5 SESSION
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative flex items-center justify-between mb-4">
        {/* Background line */}
        <div
          className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2"
          style={{ background: 'rgba(0,212,255,0.15)' }}
        />
        {/* Progress fill */}
        <div
          className="absolute top-1/2 left-0 h-px -translate-y-1/2 transition-all duration-700"
          style={{
            width: `${(currentIndex / (MILESTONES.length - 1)) * 100}%`,
            background:
              'linear-gradient(90deg, rgba(0,212,255,0.6), rgba(168,255,0,0.6))',
            boxShadow: '0 0 6px rgba(0,212,255,0.4)',
          }}
        />

        {/* Milestone dots */}
        {MILESTONES.map((m, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div
              key={m.phase}
              className="relative z-10 flex flex-col items-center"
              style={{ width: '40px' }}
            >
              {/* Dot */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold tracking-wider transition-all duration-500"
                style={{
                  background: isCompleted
                    ? 'rgba(168,255,0,0.2)'
                    : isCurrent
                      ? 'rgba(0,212,255,0.15)'
                      : 'rgba(232,237,245,0.05)',
                  border: isCompleted
                    ? '1.5px solid rgba(168,255,0,0.6)'
                    : isCurrent
                      ? '1.5px solid rgba(0,212,255,0.8)'
                      : '1px solid rgba(232,237,245,0.15)',
                  boxShadow: isCurrent
                    ? '0 0 12px rgba(0,212,255,0.4), 0 0 4px rgba(0,212,255,0.2)'
                    : isCompleted
                      ? '0 0 8px rgba(168,255,0,0.2)'
                      : 'none',
                  color: isCompleted
                    ? 'var(--neon-lime)'
                    : isCurrent
                      ? 'var(--neon-cyan)'
                      : 'rgba(232,237,245,0.25)',
                  animation: isCurrent ? 'rec-pulse 2s ease infinite' : 'none',
                }}
              >
                {isCompleted ? '\u2713' : m.icon}
              </div>
              {/* Label */}
              <span
                className="text-[7px] tracking-[0.5px] mt-1.5 text-center leading-tight whitespace-nowrap"
                style={{
                  color: isCompleted
                    ? 'rgba(168,255,0,0.7)'
                    : isCurrent
                      ? 'rgba(0,212,255,0.9)'
                      : isFuture
                        ? 'rgba(232,237,245,0.3)'
                        : undefined,
                }}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Next unlock teaser */}
      {nextMilestone && !isExhausted && (
        <div
          className="flex items-center gap-2.5 rounded-md px-3 py-2"
          style={{
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.12)',
          }}
        >
          <span
            className="text-[10px]"
            style={{
              color: 'var(--neon-cyan)',
              animation: 'neon-flicker 3s ease infinite',
            }}
          >
            {'\u25B6'}
          </span>
          <div className="flex-1">
            <span className="text-[9px] tracking-[1px] text-neon-cyan font-bold">
              NEXT: {nextMilestone.label}
            </span>
            <p className="text-[8px] text-hud-white-dim mt-0.5 tracking-wide">
              {nextMilestone.description}
            </p>
          </div>
        </div>
      )}

      {/* Exhausted state - upgrade CTA */}
      {isExhausted && (
        <button
          onClick={() => router.push('/pricing')}
          className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 cursor-pointer transition-all duration-300 active:scale-[0.98]"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(168,255,0,0.1))',
            border: '1px solid rgba(168,255,0,0.3)',
            boxShadow: '0 0 12px rgba(168,255,0,0.1)',
          }}
        >
          <span
            className="text-[9px] font-bold tracking-[2px] text-neon-lime"
            style={{ textShadow: '0 0 6px rgba(168,255,0,0.3)' }}
          >
            全機能を解放する
          </span>
          <span className="text-neon-lime text-[10px]">{'\u2192'}</span>
        </button>
      )}
    </GlassCard>
  );
}
