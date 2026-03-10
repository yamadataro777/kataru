'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions } from '@/lib/api';
import { Session } from '@/types/session';
import AuthGuard from '@/components/auth/AuthGuard';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import GlassCard from '@/components/ui/GlassCard';

export default function ArchivePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNextStep, setFilterNextStep] = useState(false);

  useEffect(() => {
    getSessions()
      .then((data) => setSessions(data.filter(s => s.status === 'completed')))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (filterNextStep) {
      result = result.filter(s => s.report?.next_step);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => {
        const r = s.report;
        if (!r) return false;
        const searchable = [
          r.title,
          r.summary,
          r.blockage,
          ...(r.topics || []),
          s.transcript,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }

    return result;
  }, [sessions, searchQuery, filterNextStep]);

  return (
    <AuthGuard>
      <div className="flex flex-col h-dvh overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col px-5 pb-4 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
          <div className="mt-4 mb-3">
            <h2 className="text-sm font-bold tracking-[2px] text-hud-white mb-3">ARCHIVE</h2>

            {/* Search bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索..."
              className="w-full bg-transparent text-xs text-hud-white tracking-wide outline-none px-3 py-2 rounded"
              style={{
                border: '1px solid rgba(0,212,255,0.2)',
                background: 'rgba(0,212,255,0.03)',
              }}
            />

            {/* Filter toggle */}
            <button
              onClick={() => setFilterNextStep(!filterNextStep)}
              className="mt-2 text-[9px] tracking-[1px] px-3 py-1.5 rounded cursor-pointer border-0 transition-all"
              style={{
                color: filterNextStep ? 'var(--neon-lime)' : 'var(--hud-white-dim)',
                background: filterNextStep ? 'rgba(168,255,0,0.08)' : 'rgba(232,237,245,0.04)',
                border: `1px solid ${filterNextStep ? 'rgba(168,255,0,0.3)' : 'rgba(232,237,245,0.1)'}`,
              }}
            >
              次の一歩あり
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-xs tracking-[3px] text-neon-cyan" style={{ animation: 'neon-flicker 2s ease infinite' }}>
                LOADING...
              </span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-xs text-hud-white-dim tracking-[2px]">
                {searchQuery ? '該当するセッションがありません' : 'セッションがありません'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredSessions.map((session) => {
                const r = session.report;
                if (!r) return null;

                const subtitle = r.blockage || r.summary || '';
                const truncated = subtitle.length > 50 ? subtitle.slice(0, 50) + '...' : subtitle;
                const pointsCount = r.discussion_points?.length || r.key_insights?.length || 0;
                const hasNextStep = !!r.next_step;
                const date = new Date(session.created_at);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

                return (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/results?id=${session.id}`)}
                    className="text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    <GlassCard className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold tracking-[1px] text-hud-white truncate">
                            {r.title}
                          </p>
                          <p className="text-[10px] text-hud-white-dim tracking-wide mt-1 leading-5">
                            {truncated}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[9px] text-hud-white-dim tracking-[1px]">{dateStr}</span>
                          <div className="flex items-center gap-1.5">
                            {pointsCount > 0 && (
                              <span
                                className="text-[8px] px-1.5 py-0.5 rounded"
                                style={{
                                  background: 'rgba(0,212,255,0.08)',
                                  color: 'var(--neon-cyan)',
                                  border: '1px solid rgba(0,212,255,0.2)',
                                }}
                              >
                                {pointsCount}論点
                              </span>
                            )}
                            {hasNextStep && (
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: 'var(--neon-lime)',
                                  boxShadow: '0 0 4px var(--neon-lime)',
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
}
