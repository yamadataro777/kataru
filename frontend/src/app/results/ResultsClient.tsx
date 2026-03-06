'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';
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

  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;
  const phase = getSessionPhase(freeSessionsUsed > 0 ? freeSessionsUsed - 1 : 0);
  const showFeedback = shouldShowFeedbackAfterResults(plan, freeSessionsUsed);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setLoading(false);
      return;
    }

    getSession(id)
      .then(setSession)
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
        <span className="label">ANALYSIS REPORT</span>
        <h1
          className="text-xl font-bold tracking-[2px] mt-2 text-hud-white"
          style={{ animation: 'glitch-in 0.4s ease forwards' }}
        >
          {report.title}
        </h1>
        <div className="hud-line mt-3" />
      </div>

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
            <p className="text-[9px] text-neon-lime opacity-50 tracking-[1px] text-center mt-3">
              次回のセッションで詳細レポートを体験できます
            </p>
          </GlassCard>
        )}

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
