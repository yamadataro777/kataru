'use client';

import { useRouter } from 'next/navigation';

interface TopicTagsProps {
  topics: string[];
}

const tagColors = [
  { border: 'rgba(0,212,255,0.3)', bg: 'rgba(0,212,255,0.08)', text: 'var(--neon-cyan)' },
  { border: 'rgba(255,59,122,0.3)', bg: 'rgba(255,59,122,0.08)', text: 'var(--neon-magenta)' },
  { border: 'rgba(168,255,0,0.3)', bg: 'rgba(168,255,0,0.08)', text: 'var(--neon-lime)' },
];

export default function TopicTags({ topics }: TopicTagsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, i) => {
        const color = tagColors[i % tagColors.length];
        return (
          <button
            key={i}
            onClick={() => router.push(`/history?topic=${encodeURIComponent(topic)}`)}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[2px] uppercase cursor-pointer transition-all hover:opacity-80"
            style={{
              border: `1px solid ${color.border}`,
              background: color.bg,
              color: color.text,
            }}
          >
            {topic}
          </button>
        );
      })}
    </div>
  );
}
