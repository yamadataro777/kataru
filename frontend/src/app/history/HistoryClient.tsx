'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import GlassCard from '@/components/ui/GlassCard';
import { getSessions, generateReport } from '@/lib/api';
import { Session } from '@/types/session';

function getSessionBadge(session: Session): { label: string; color: string; border: string } | null {
  if (session.status !== 'completed') return null;
  // Conclusion reached — show completion badge
  if (session.user_conclusion) {
    return { label: '結論済', color: 'var(--neon-lime)', border: 'rgba(168,255,0,0.25)' };
  }
  // Incubation badges for sessions without conclusion
  const daysElapsed = Math.floor((Date.now() - new Date(session.created_at).getTime()) / 86400000);
  if (daysElapsed < 1) return null;
  if (daysElapsed >= 7) {
    return { label: '再考の時', color: 'var(--neon-magenta)', border: 'rgba(255,59,122,0.25)' };
  }
  return { label: '寝かせ中', color: 'var(--neon-cyan)', border: 'rgba(0,212,255,0.25)' };
}

export default function HistoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicFilter = searchParams.get('topic');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateReport = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setGeneratingId(sessionId);
    try {
      await generateReport(sessionId);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'completed' as const } : s))
      );
      router.push(`/results?id=${sessionId}`);
    } catch {
      setGeneratingId(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const filtered = topicFilter
    ? sessions.filter(s => s.report?.topics?.includes(topicFilter))
    : sessions;

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      <div className="flex-1 px-5 pb-20 overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
        <div className="mt-4 mb-5">
          <span className="label">SESSION HISTORY</span>
          {topicFilter ? (
            <>
              <h2 className="text-lg font-bold tracking-[2px] mt-1" style={{ fontFamily: 'sans-serif' }}>
                「{topicFilter}」に関するセッション
              </h2>
              <button
                onClick={() => router.push('/history')}
                className="mt-2 text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer flex items-center gap-1"
              >
                <span>&larr;</span> すべてのセッションを表示
              </button>
            </>
          ) : (
            <h2 className="text-lg font-bold tracking-[2px] mt-1">All Recordings</h2>
          )}
          <div className="hud-line mt-3" />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <span
              className="text-xs tracking-[3px] text-neon-cyan"
              style={{ animation: 'neon-flicker 2s ease infinite' }}
            >
              LOADING...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs tracking-[2px] text-hud-white-dim">
              {topicFilter ? `「${topicFilter}」に関するセッションはありません` : 'NO SESSIONS FOUND'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((session) => {
              const badge = getSessionBadge(session);
              return (
                <GlassCard
                  key={session.id}
                  className="p-4 cursor-pointer transition-all duration-200 hover:border-[rgba(0,212,255,0.35)]"
                  variant="cyan"
                  onClick={() => {
                    if (session.status === 'completed') {
                      router.push(`/results?id=${session.id}`);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold tracking-wide text-hud-white">
                      {session.report?.title || 'Untitled Session'}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {badge && (
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded tracking-[1px]"
                          style={{
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            opacity: 0.7,
                          }}
                        >
                          {badge.label}
                        </span>
                      )}
                      <span
                        className="text-[9px] px-2 py-1 rounded tracking-[1px]"
                        style={{
                          border: `1px solid ${
                            session.status === 'completed'
                              ? 'rgba(168,255,0,0.3)'
                              : session.status === 'error'
                              ? 'rgba(255,59,122,0.3)'
                              : 'rgba(0,212,255,0.3)'
                          }`,
                          color:
                            session.status === 'completed'
                              ? 'var(--neon-lime)'
                              : session.status === 'error'
                              ? 'var(--neon-magenta)'
                              : 'var(--neon-cyan)',
                        }}
                      >
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-hud-white-dim tracking-[1px]">
                    <span>
                      {new Date(session.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>{formatDuration(session.duration_seconds)}</span>
                    {session.word_count && <span>{session.word_count} words</span>}
                  </div>
                  {topicFilter && session.user_conclusion && (
                    <p
                      className="mt-2 text-[11px] leading-5 text-hud-white-dim tracking-wide truncate"
                      style={{ fontFamily: 'sans-serif' }}
                    >
                      結論: {session.user_conclusion.slice(0, 50)}{session.user_conclusion.length > 50 ? '...' : ''}
                    </p>
                  )}
                  {session.status === 'generating' && session.transcript && (
                    <button
                      onClick={(e) => handleGenerateReport(e, session.id)}
                      disabled={generatingId === session.id}
                      className="mt-3 w-full text-[10px] tracking-[2px] font-bold py-2 rounded cursor-pointer transition-all disabled:opacity-40"
                      style={{
                        color: 'var(--neon-cyan)',
                        background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.3)',
                      }}
                    >
                      {generatingId === session.id ? 'GENERATING...' : 'レポートを生成'}
                    </button>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
