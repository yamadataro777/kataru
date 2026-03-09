'use client';

import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';

type SessionType = 'thinking' | 'goal' | 'emotion';

interface OnboardingResultProps {
  type: SessionType;
  report: Record<string, unknown>;
  onNext: () => void;
  isLast: boolean;
}

function ThinkingResult({ report, onNext }: { report: Record<string, unknown>; onNext: () => void }) {
  const map = report.thinking_map as { surface: string; underlying: string; connection: string } | undefined;
  const score = Number(report.clarity_score ?? 0);
  const title = String(report.title ?? '');
  const question = String(report.one_question ?? '');

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="label text-center">THINKING MAP</p>
      <h2 className="text-xl font-bold tracking-[2px] text-center">{title}</h2>

      <GlassCard variant="cyan" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-cyan mb-1">SURFACE</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {map?.surface ?? ''}
        </p>
      </GlassCard>

      <GlassCard variant="magenta" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-magenta mb-1">UNDERLYING</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {map?.underlying ?? ''}
        </p>
      </GlassCard>

      <GlassCard variant="lime" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-lime mb-1">CONNECTION</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {map?.connection ?? ''}
        </p>
      </GlassCard>

      {/* Clarity gauge */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-[2px]" style={{ color: 'var(--white-dim)' }}>明確度</span>
          <span className="text-sm font-bold text-neon-cyan">{Math.round(score * 100)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(232,237,245,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${score * 100}%`,
              background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-lime))',
              boxShadow: '0 0 8px rgba(0,212,255,0.4)',
            }}
          />
        </div>
      </div>

      {/* Question */}
      {question && (
        <div className="text-center mt-2">
          <p
            className="text-sm italic leading-relaxed"
            style={{ color: 'var(--neon-cyan)', fontFamily: 'sans-serif', textShadow: '0 0 10px rgba(0,212,255,0.3)' }}
          >
            「{question}」
          </p>
        </div>
      )}

      <div className="mt-4">
        <NeonButton variant="magenta" onClick={onNext} className="w-full">
          次のセッションへ
        </NeonButton>
      </div>
    </div>
  );
}

function GoalResult({ report, onNext }: { report: Record<string, unknown>; onNext: () => void }) {
  const title = String(report.title ?? '');
  const statedGoal = String(report.stated_goal ?? '');
  const realDesire = String(report.real_desire ?? '');
  const firstStep = String(report.first_step ?? '');
  const hiddenFear = String(report.hidden_fear ?? '');
  const reframe = String(report.reframe ?? '');

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="label text-center">GOAL ANALYSIS</p>
      <h2 className="text-xl font-bold tracking-[2px] text-center">{title}</h2>

      <GlassCard className="p-4">
        <p className="text-[10px] tracking-[2px] mb-1" style={{ color: 'var(--white-dim)' }}>あなたの言葉</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif' }}>
          「{statedGoal}」
        </p>
      </GlassCard>

      <GlassCard variant="magenta" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-magenta mb-1">本当の欲求</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {realDesire}
        </p>
      </GlassCard>

      {/* Arrow */}
      <div className="flex justify-center">
        <div
          className="text-lg"
          style={{
            color: 'var(--neon-lime)',
            animation: 'pulse-arrow 2s ease-in-out infinite',
            textShadow: '0 0 10px rgba(168,255,0,0.4)',
          }}
        >
          ↓
        </div>
      </div>

      <GlassCard variant="lime" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-lime mb-1">明日できる一歩</p>
        <p className="text-xs leading-relaxed font-bold" style={{ fontFamily: 'sans-serif' }}>
          {firstStep}
        </p>
      </GlassCard>

      {hiddenFear && (
        <GlassCard className="p-4">
          <p className="text-[10px] tracking-[2px] mb-1" style={{ color: 'var(--white-dim)' }}>HIDDEN INSIGHT</p>
          <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
            {hiddenFear}
          </p>
        </GlassCard>
      )}

      {reframe && (
        <p className="text-xs text-center leading-relaxed mt-2" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          別の見方: <span style={{ color: 'var(--neon-cyan)' }}>{reframe}</span>
        </p>
      )}

      <div className="mt-4">
        <NeonButton variant="lime" onClick={onNext} className="w-full">
          最後のセッションへ
        </NeonButton>
      </div>

      <style jsx>{`
        @keyframes pulse-arrow {
          0%, 100% { opacity: 0.5; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
}

function EmotionResult({ report, onNext }: { report: Record<string, unknown>; onNext: () => void }) {
  const emotions = (report.emotions_detected as string[]) ?? [];
  const primary = String(report.primary_emotion ?? '');
  const title = String(report.title ?? '');
  const emotionSource = String(report.emotion_source ?? '');
  const pattern = String(report.pattern ?? '');
  const selfUnderstanding = String(report.self_understanding ?? '');

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="label text-center">EMOTION MAP</p>
      <h2 className="text-xl font-bold tracking-[2px] text-center">{title}</h2>

      {/* Emotion pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {emotions.map((emotion) => {
          const isPrimary = emotion === primary;
          return (
            <span
              key={emotion}
              className="px-3 py-1 rounded-full text-xs border"
              style={{
                borderColor: isPrimary ? 'var(--neon-lime)' : 'rgba(232,237,245,0.2)',
                color: isPrimary ? 'var(--neon-lime)' : 'var(--white-dim)',
                background: isPrimary ? 'rgba(168,255,0,0.1)' : 'transparent',
                boxShadow: isPrimary ? '0 0 12px rgba(168,255,0,0.3)' : 'none',
                fontFamily: 'sans-serif',
              }}
            >
              {emotion}
            </span>
          );
        })}
      </div>

      <GlassCard variant="lime" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-lime mb-1">感情の源</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {emotionSource}
        </p>
      </GlassCard>

      <GlassCard variant="magenta" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-magenta mb-1">パターン</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {pattern}
        </p>
      </GlassCard>

      <GlassCard variant="cyan" className="p-4">
        <p className="text-[10px] tracking-[2px] text-neon-cyan mb-1">SELF INSIGHT</p>
        <p className="text-xs leading-relaxed" style={{ fontFamily: 'sans-serif', color: 'var(--white-dim)' }}>
          {selfUnderstanding}
        </p>
      </GlassCard>

      <div className="mt-4">
        <NeonButton variant="cyan" onClick={onNext} className="w-full text-base py-5">
          Kataruを始める
        </NeonButton>
      </div>
    </div>
  );
}

export default function OnboardingResult({ type, report, onNext, isLast }: OnboardingResultProps) {
  // isLast is used implicitly by child components choosing button text
  void isLast;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6" style={{ overscrollBehaviorY: 'contain' }}>
      {type === 'thinking' && <ThinkingResult report={report} onNext={onNext} />}
      {type === 'goal' && <GoalResult report={report} onNext={onNext} />}
      {type === 'emotion' && <EmotionResult report={report} onNext={onNext} />}
    </div>
  );
}
