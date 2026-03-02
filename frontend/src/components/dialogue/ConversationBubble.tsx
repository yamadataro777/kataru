'use client';

import { ConversationPhase, QuestionType, PHASE_LABELS } from '@/types/conversation';

interface ConversationBubbleProps {
  role: 'user' | 'ai';
  content: string;
  phase?: ConversationPhase;
  questionType?: QuestionType | null;
  timestamp?: string;
}

export default function ConversationBubble({
  role,
  content,
  phase,
  timestamp,
}: ConversationBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={{
          background: isUser
            ? 'rgba(0,212,255,0.08)'
            : 'rgba(255,59,122,0.08)',
          border: `1px solid ${
            isUser ? 'rgba(0,212,255,0.25)' : 'rgba(255,59,122,0.25)'
          }`,
          boxShadow: isUser
            ? 'inset 0 0 15px rgba(0,212,255,0.05)'
            : 'inset 0 0 15px rgba(255,59,122,0.05)',
        }}
      >
        {phase && !isUser && (
          <span
            className="text-[8px] tracking-[2px] uppercase mb-1 block"
            style={{ color: 'var(--neon-magenta)', opacity: 0.7 }}
          >
            {PHASE_LABELS[phase]}
          </span>
        )}
        <p
          className="text-sm leading-6 tracking-wide"
          style={{ color: 'var(--white)', opacity: 0.9 }}
        >
          {content}
        </p>
        {timestamp && (
          <span className="text-[8px] text-hud-white-dim mt-1 block text-right tracking-[1px]">
            {new Date(timestamp).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
