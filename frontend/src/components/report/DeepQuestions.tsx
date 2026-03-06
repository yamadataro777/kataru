'use client';

import GlassCard from '@/components/ui/GlassCard';

interface DeepQuestion {
  question: string;
  context: string;
  angle: string;
}

interface DeepQuestionsProps {
  questions: DeepQuestion[];
}

export default function DeepQuestions({ questions }: DeepQuestionsProps) {
  return (
    <GlassCard className="p-4" variant="magenta" hudCorners>
      <h3
        className="text-xs font-bold tracking-[3px] uppercase text-neon-magenta mb-4"
        style={{ textShadow: '0 0 10px rgba(255,59,122,0.3)' }}
      >
        DEEP QUESTIONS
      </h3>
      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-sm leading-6 text-hud-white opacity-90 tracking-wide font-medium">
              {q.question}
            </p>
            <p className="text-xs leading-5 text-hud-white opacity-50 tracking-wide">
              {q.context}
            </p>
            <p className="text-xs leading-5 tracking-wide" style={{ color: 'var(--neon-magenta)' }}>
              &rarr; {q.angle}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
