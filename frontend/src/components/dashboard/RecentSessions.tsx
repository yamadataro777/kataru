'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@/types/session';
import { Conversation } from '@/types/conversation';
import GlassCard from '@/components/ui/GlassCard';

interface RecentSessionsProps {
  sessions: Session[];
  conversations?: Conversation[];
}

interface RecentItem {
  id: string;
  type: 'session' | 'conversation';
  title: string;
  created_at: string;
  status: string;
  navigateTo: string | null;
  user_conclusion: string | null;
}

export default function RecentSessions({ sessions, conversations = [] }: RecentSessionsProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(() => {
    const sessionItems: RecentItem[] = sessions.map((s) => ({
      id: s.id,
      type: 'session',
      title: s.report?.title || 'Untitled Session',
      created_at: s.created_at,
      status: s.status,
      navigateTo: s.status === 'completed' ? `/results?id=${s.id}` : null,
      user_conclusion: s.user_conclusion || null,
    }));

    const convItems: RecentItem[] = conversations.map((c) => ({
      id: c.id,
      type: 'conversation',
      title: c.final_report?.title || '対話セッション',
      created_at: c.created_at,
      status: c.status,
      navigateTo: c.status === 'ended'
        ? `/dialogue/results?id=${c.id}`
        : `/dialogue?id=${c.id}`,
      user_conclusion: null,
    }));

    return [...sessionItems, ...convItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [sessions, conversations]);

  if (items.length === 0) {
    return (
      <GlassCard className="p-4">
        <div className="text-center text-hud-white-dim text-xs tracking-[2px]">
          NO SESSIONS YET
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-80">
          RECENT SESSIONS
        </span>
        <button
          onClick={() => router.push('/history')}
          className="text-[9px] tracking-[1px] text-hud-white-dim bg-transparent border-0 cursor-pointer hover:text-neon-cyan transition-colors"
        >
          VIEW ALL
        </button>
      </div>
      <div className="flex flex-col">
        {items.map((item) => {
          const isCompleted = item.status === 'completed' || item.status === 'ended';
          const isDialogue = item.type === 'conversation';

          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id} className="border-t border-[rgba(0,212,255,0.08)]">
              <div
                className="flex justify-between items-center py-2.5 cursor-pointer hover:bg-[rgba(0,212,255,0.03)] transition-colors -mx-4 px-4"
                onClick={() => {
                  if (item.navigateTo) {
                    router.push(item.navigateTo);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {isDialogue && (
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded tracking-[1px]"
                      style={{
                        border: '1px solid rgba(255,59,122,0.3)',
                        color: 'var(--neon-magenta)',
                      }}
                    >
                      対話
                    </span>
                  )}
                  <div>
                    <div className="text-xs text-hud-white tracking-wide">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-hud-white-dim tracking-[1px] mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[9px] px-2 py-1 rounded tracking-[1px]"
                  style={{
                    border: `1px solid ${isCompleted ? 'rgba(168,255,0,0.3)' : 'rgba(0,212,255,0.3)'}`,
                    color: isCompleted ? 'var(--neon-lime)' : 'var(--neon-cyan)',
                  }}
                >
                  {item.status.toUpperCase()}
                </span>
              </div>
              {item.user_conclusion && (
                <div className="-mx-4 px-4 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : item.id);
                    }}
                    className="text-[10px] tracking-[1px] text-hud-white-dim bg-transparent border-0 cursor-pointer hover:text-neon-cyan transition-colors pl-0"
                  >
                    {isExpanded ? '▼' : '▶'} 自分の結論
                  </button>
                  {isExpanded && (
                    <div
                      className="mt-1.5 p-2.5 rounded text-[11px] leading-relaxed text-hud-white tracking-wide"
                      style={{
                        background: 'rgba(0, 212, 255, 0.05)',
                        border: '1px solid rgba(0, 212, 255, 0.1)',
                      }}
                    >
                      {item.user_conclusion}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
