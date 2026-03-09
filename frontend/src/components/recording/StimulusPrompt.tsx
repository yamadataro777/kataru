'use client';

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
    <div className="h-10 flex items-center justify-center px-5">
      <div
        className="w-full rounded px-4 py-2 text-center"
        style={{
          background: 'rgba(16,22,42,0.5)',
          border: '1px solid var(--glass-border)',
          animation: visible ? 'stimulus-fade-in 0.4s ease forwards' : 'stimulus-fade-out 0.4s ease forwards',
        }}
      >
        <span
          className="text-[10px] tracking-[2px]"
          style={{
            color: 'var(--neon-lime)',
            textShadow: '0 0 8px rgba(168,255,0,0.3)',
          }}
        >
          {question}
        </span>
      </div>
    </div>
  );
}
