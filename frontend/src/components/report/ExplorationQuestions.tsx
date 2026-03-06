'use client';

import GlassCard from '@/components/ui/GlassCard';

interface ExplorationQuestionsProps {
  questions: string[];
}

export default function ExplorationQuestions({ questions }: ExplorationQuestionsProps) {
  return (
    <GlassCard className="p-4" variant="lime" hudCorners>
      <h3
        className="text-xs font-bold tracking-[3px] uppercase mb-4"
        style={{ color: 'var(--neon-lime)', textShadow: '0 0 10px rgba(168,255,0,0.3)' }}
      >
        THINKING SEEDS
      </h3>
      <div className="flex flex-col gap-3">
        {questions.map((question, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span
              className="text-sm font-bold flex-shrink-0"
              style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.4)' }}
            >
              ?
            </span>
            <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
              {question}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
