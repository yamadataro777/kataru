'use client';

import { useRef, useEffect } from 'react';
import { ConversationTurn, ConversationPhase } from '@/types/conversation';
import ConversationBubble from './ConversationBubble';

interface ConversationThreadProps {
  turns: ConversationTurn[];
}

export default function ConversationThread({ turns }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {turns.map((turn, i) => (
        <div key={`turn-${i}`}>
          {turn.user_transcript && (
            <ConversationBubble
              role="user"
              content={turn.user_transcript}
              timestamp={turn.created_at}
            />
          )}
          <ConversationBubble
            role="ai"
            content={turn.ai_response}
            phase={turn.phase as ConversationPhase}
            questionType={turn.question_type}
            timestamp={turn.created_at}
          />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
