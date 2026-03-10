'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSession, updateSession, deleteSession } from '@/lib/api';
import { Session } from '@/types/session';
import { useAuth } from '@/contexts/AuthContext';
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
  const [showFullReport, setShowFullReport] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [savedStep, setSavedStep] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setLoading(false);
      return;
    }

    getSession(id)
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [searchParams]);

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

  // Fallback values for 3-card structure
  const blockage = report.blockage || report.key_insights?.[0] || report.summary;
  const discussionPoints = report.discussion_points || report.key_insights?.slice(0, 3) || [];
  const nextStep = report.next_step || report.action_items?.[0] || null;

  const handleSaveNextStep = async () => {
    if (!nextStep) return;
    setSavingStep(true);
    try {
      await updateSession(session.id, { user_conclusion: nextStep });
      setSavedStep(true);
      setTimeout(() => setSavedStep(false), 2000);
    } catch (e) {
      console.error('Failed to save next step:', e);
    } finally {
      setSavingStep(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSession(session.id);
      router.push('/');
    } catch (e) {
      console.error('Failed to delete session:', e);
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh pb-8">
      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-[9px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer mb-3 flex items-center gap-1"
        >
          <span>&larr;</span> BACK
        </button>
        <div className="hud-line mt-1" />
      </div>

      {/* 3-Card Structure */}
      <div className="flex flex-col gap-4 px-5 overflow-y-auto">
        {/* Card 1: 今の詰まり */}
        <GlassCard className="p-4" variant="magenta">
          <span
            className="text-[9px] tracking-[3px] font-bold block mb-2"
            style={{ color: 'var(--neon-magenta)', textShadow: '0 0 8px rgba(255,59,122,0.3)' }}
          >
            今の詰まり
          </span>
          <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide" style={{ fontFamily: 'sans-serif' }}>
            {blockage}
          </p>
        </GlassCard>

        {/* Card 2: 論点 */}
        {discussionPoints.length > 0 && (
          <GlassCard className="p-4" variant="cyan">
            <span className="label mb-3 block">論点</span>
            <div className="flex flex-col gap-2">
              {discussionPoints.map((point, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-neon-cyan text-xs flex-shrink-0 font-mono">{i + 1}.</span>
                  <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide" style={{ fontFamily: 'sans-serif' }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Card 3: 次の一歩 */}
        {nextStep && (
          <GlassCard className="p-4" variant="lime">
            <span
              className="text-[9px] tracking-[3px] font-bold block mb-2"
              style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
            >
              次の一歩
            </span>
            <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide" style={{ fontFamily: 'sans-serif' }}>
              {nextStep}
            </p>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          {/* この一歩を残す */}
          {nextStep && (
            <button
              onClick={handleSaveNextStep}
              disabled={savingStep || savedStep}
              className="w-full text-[11px] tracking-[2px] font-bold py-3 rounded-lg cursor-pointer transition-all disabled:opacity-50"
              style={{
                color: savedStep ? 'var(--neon-lime)' : 'var(--bg-dark)',
                background: savedStep ? 'rgba(168,255,0,0.12)' : 'var(--neon-lime)',
                border: `1px solid ${savedStep ? 'rgba(168,255,0,0.4)' : 'var(--neon-lime)'}`,
                boxShadow: savedStep ? 'none' : '0 0 20px rgba(168,255,0,0.2)',
              }}
            >
              {savingStep ? 'SAVING...' : savedStep ? 'SAVED' : 'この一歩を残す'}
            </button>
          )}

          {/* 全文を見る */}
          <button
            onClick={() => setShowFullReport(!showFullReport)}
            className="w-full text-[11px] tracking-[2px] font-bold py-3 rounded-lg cursor-pointer transition-all"
            style={{
              color: 'var(--neon-cyan)',
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.25)',
            }}
          >
            {showFullReport ? '閉じる' : '全文を見る'}
          </button>

          {/* 続きをあとで話す */}
          <button
            onClick={() => router.push('/')}
            className="w-full text-[10px] tracking-[1px] py-2.5 rounded-lg cursor-pointer transition-all"
            style={{
              color: 'var(--hud-white-dim)',
              background: 'transparent',
              border: '1px solid rgba(232,237,245,0.1)',
            }}
          >
            続きをあとで話す
          </button>

          {/* 削除 */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[9px] tracking-[1px] py-2 cursor-pointer bg-transparent border-0 mx-auto"
            style={{ color: 'var(--neon-magenta)', opacity: 0.5 }}
          >
            削除
          </button>
        </div>

        {/* Full Report (collapsible) */}
        {showFullReport && (
          <div className="flex flex-col gap-4 mt-2" style={{ animation: 'glitch-in 0.3s ease forwards' }}>
            <div className="hud-line" />

            {/* Title */}
            <h2 className="text-lg font-bold tracking-[2px] text-hud-white">
              {report.title}
            </h2>

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

            {/* Exploration Questions */}
            {report.exploration_questions && report.exploration_questions.length > 0 && (
              <ExplorationQuestions questions={report.exploration_questions} />
            )}

            {/* Deep Questions */}
            {report.deep_questions && report.deep_questions.length > 0 && (
              <DeepQuestions questions={report.deep_questions} />
            )}

            {/* Sentiment */}
            <SentimentGauge
              overall={report.sentiment.overall}
              score={report.sentiment.score}
              details={report.sentiment.details}
            />

            {/* Report Sections */}
            {report.structure?.sections?.map((section, i) => (
              <ReportSection key={i} heading={section.heading} content={section.content} />
            ))}

            {/* Contradictions */}
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

            {/* Thinking Pattern */}
            {report.thinking_pattern && (
              <GlassCard className="p-4" variant="cyan">
                <span className="label mb-2 block">THINKING PATTERN</span>
                <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
                  {report.thinking_pattern}
                </p>
              </GlassCard>
            )}

            {/* Action Items */}
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
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,26,0.9)]">
          <GlassCard className="mx-8 max-w-sm p-6" variant="magenta">
            <h3
              className="text-sm font-bold tracking-[2px] mb-3"
              style={{ color: 'var(--neon-magenta)' }}
            >
              セッションを削除
            </h3>
            <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-4">
              この操作は取り消せません。本当に削除しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-[10px] tracking-[2px] font-bold rounded py-2 cursor-pointer disabled:opacity-50"
                style={{
                  color: 'var(--bg-dark)',
                  background: 'var(--neon-magenta)',
                  border: '1px solid var(--neon-magenta)',
                }}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
