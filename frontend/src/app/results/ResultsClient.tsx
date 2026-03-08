'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSession, updateSession } from '@/lib/api';
import { Session } from '@/types/session';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionPhase, shouldShowFeedbackAfterResults } from '@/lib/session-tracker';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import KeyInsights from '@/components/report/KeyInsights';
import TopicTags from '@/components/report/TopicTags';
import SentimentGauge from '@/components/report/SentimentGauge';
import ReportSection from '@/components/report/ReportSection';
import ExplorationQuestions from '@/components/report/ExplorationQuestions';
import DeepQuestions from '@/components/report/DeepQuestions';

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [conclusion, setConclusion] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;
  const phase = getSessionPhase(freeSessionsUsed > 0 ? freeSessionsUsed - 1 : 0);
  const showFeedback = shouldShowFeedbackAfterResults(plan, freeSessionsUsed);

  const conclusionRef = useRef(conclusion);
  conclusionRef.current = conclusion;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setLoading(false);
      return;
    }

    getSession(id)
      .then((s) => {
        setSession(s);
        setConclusion(s.user_conclusion || '');
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const handleSaveConclusion = async () => {
    const s = sessionRef.current;
    if (!s) return;
    setSaving(true);
    try {
      await updateSession(s.id, { user_conclusion: conclusionRef.current || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save conclusion:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <span
          className="text-xs tracking-[3px] text-neon-cyan"
          style={{ animation: 'neon-flicker 2s ease infinite' }}
        >
          LOADING...
        </span>
      </div>
    );
  }

  if (!session || !session.report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-8">
        <p className="text-xs tracking-[2px] text-hud-white-dim">SESSION NOT FOUND</p>
        <NeonButton onClick={() => router.push('/')}>BACK TO HOME</NeonButton>
      </div>
    );
  }

  const { report } = session;
  const isPaidReport = !!report.action_items || !!report.contradictions;

  const handleBack = () => {
    if (showFeedback) {
      router.push('/feedback');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0">
        <button
          onClick={handleBack}
          className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer mb-3 flex items-center gap-1"
        >
          <span>&larr;</span> BACK
        </button>
        <span className="label">AIの見立て</span>
        <h1
          className="text-xl font-bold tracking-[2px] mt-2 text-hud-white"
          style={{ animation: 'glitch-in 0.4s ease forwards' }}
        >
          {report.title}
        </h1>
        <div className="hud-line mt-3" />
      </div>

      {/* Unlock Banner */}
      {isPaidReport && phase === 'full_preview' && (
        <div
          className="mx-5 mb-2 rounded-lg px-4 py-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(168,255,0,0.08), rgba(0,212,255,0.08))',
            border: '1px solid rgba(168,255,0,0.3)',
            boxShadow: '0 0 20px rgba(168,255,0,0.08)',
            animation: 'glitch-in 0.6s ease forwards',
          }}
        >
          <span
            className="text-lg"
            style={{ filter: 'drop-shadow(0 0 6px rgba(168,255,0,0.5))' }}
          >
            {'\u2606'}
          </span>
          <div className="flex-1">
            <p
              className="text-[10px] font-bold tracking-[2px] text-neon-lime"
              style={{ textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
            >
              FULL REPORT UNLOCKED
            </p>
            <p className="text-[8px] text-hud-white-dim tracking-wide mt-0.5">
              詳細レポートが解放されました。矛盾検出・アクション提案・思考パターン分析をご覧ください。
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-4 px-5 overflow-y-auto">
        {/* Summary */}
        <GlassCard className="p-4" variant="cyan">
          <span className="label mb-2 block">SUMMARY</span>
          <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
            {report.summary}
          </p>
        </GlassCard>

        {/* Topics */}
        <div>
          <span className="label mb-2 block">TOPICS</span>
          <TopicTags topics={report.topics} />
        </div>

        {/* Key Insights */}
        <KeyInsights insights={report.key_insights} />

        {/* Exploration Questions (free) */}
        {report.exploration_questions && report.exploration_questions.length > 0 && (
          <ExplorationQuestions questions={report.exploration_questions} />
        )}

        {/* Deep Questions (paid / free trial) */}
        {report.deep_questions && report.deep_questions.length > 0 && (
          <DeepQuestions questions={report.deep_questions} />
        )}

        {/* Sentiment */}
        <SentimentGauge
          overall={report.sentiment.overall}
          score={report.sentiment.score}
          details={report.sentiment.details}
        />

        {/* Report Sections (paid only) */}
        {report.structure?.sections?.map((section, i) => (
          <ReportSection key={i} heading={section.heading} content={section.content} />
        ))}

        {/* Contradictions (paid only) */}
        {report.contradictions && report.contradictions.length > 0 && (
          <GlassCard className="p-4" variant="magenta">
            <span className="label label-magenta mb-3 block">CONTRADICTIONS</span>
            <div className="flex flex-col gap-2">
              {report.contradictions.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-neon-magenta text-xs flex-shrink-0">&#9671;</span>
                  <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Thinking Pattern (paid only) */}
        {report.thinking_pattern && (
          <GlassCard className="p-4" variant="cyan">
            <span className="label mb-2 block">THINKING PATTERN</span>
            <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
              {report.thinking_pattern}
            </p>
          </GlassCard>
        )}

        {/* Action Items (paid only) */}
        {report.action_items && report.action_items.length > 0 && (
          <GlassCard className="p-4" variant="magenta">
            <span className="label label-magenta mb-3 block">ACTION ITEMS</span>
            <div className="flex flex-col gap-2">
              {report.action_items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-neon-magenta text-xs flex-shrink-0">&#9656;</span>
                  <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Teaser for free users (session 2) - show what paid reports include */}
        {!isPaidReport && phase === 'teaser' && (
          <GlassCard className="p-4" variant="lime">
            <span className="label mb-2 block" style={{ color: 'var(--neon-lime)' }}>UPGRADE PREVIEW</span>
            <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-3">
              有料プランでは以下の分析も利用できます:
            </p>
            <div className="flex flex-col gap-2">
              {['矛盾点の検出', 'アクション提案', '思考パターン分析', '構造化された詳細レポート', '思考を深める問い'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-neon-lime text-[9px]">&#10003;</span>
                  <span className="text-[10px] text-hud-white opacity-60 tracking-wide">{item}</span>
                </div>
              ))}
            </div>
            <div
              className="mt-3 rounded-md px-3 py-2 flex items-center gap-2"
              style={{
                background: 'rgba(168,255,0,0.04)',
                border: '1px solid rgba(168,255,0,0.15)',
              }}
            >
              <span className="text-neon-lime text-[10px]">{'\u25B6'}</span>
              <span className="text-[9px] text-neon-lime tracking-[1px]">
                次のセッションで詳細レポートが解放されます
              </span>
            </div>
          </GlassCard>
        )}

        {/* Your Conclusion */}
        <GlassCard className="p-4" variant="lime">
          <span
            className="text-[9px] tracking-[3px] font-bold block mb-3"
            style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
          >
            あなたの結論
          </span>
          <textarea
            value={conclusion}
            onChange={(e) => {
              setConclusion(e.target.value);
              setSaved(false);
            }}
            placeholder="結局、自分はどう思う？"
            rows={4}
            className="w-full bg-transparent text-sm leading-7 text-hud-white tracking-wide resize-none outline-none placeholder:text-hud-white-dim placeholder:opacity-40"
            style={{
              border: 'none',
              borderBottom: '1px solid rgba(168,255,0,0.15)',
              paddingBottom: '8px',
            }}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveConclusion}
              disabled={saving || saved}
              className="text-[9px] tracking-[2px] font-bold px-4 py-2 rounded cursor-pointer transition-all disabled:opacity-50"
              style={{
                color: saved ? 'var(--neon-lime)' : 'var(--hud-white)',
                background: saved ? 'rgba(168,255,0,0.12)' : 'rgba(168,255,0,0.06)',
                border: `1px solid ${saved ? 'rgba(168,255,0,0.4)' : 'rgba(168,255,0,0.2)'}`,
              }}
            >
              {saving ? 'SAVING...' : saved ? 'SAVED' : '保存する'}
            </button>
          </div>
        </GlassCard>

        {/* Back button */}
        <div className="mt-4 flex justify-center">
          <NeonButton onClick={handleBack}>
            {showFeedback ? '次へ' : 'ホームに戻る'}
          </NeonButton>
        </div>
      </div>
    </div>
  );
}
