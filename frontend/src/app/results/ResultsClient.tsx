'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';
import { Session } from '@/types/session';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import KeyInsights from '@/components/report/KeyInsights';
import TopicTags from '@/components/report/TopicTags';
import SentimentGauge from '@/components/report/SentimentGauge';
import ReportSection from '@/components/report/ReportSection';

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

        {/* Upsell Teaser (shown for free reports - no action_items and no structure) */}
        {(!report.action_items || report.action_items.length === 0) &&
         (!report.structure || !report.structure.sections || report.structure.sections.length === 0) && (
          <div
            className="rounded-lg p-4 border"
            style={{
              borderColor: 'rgba(168,255,0,0.2)',
              background: 'linear-gradient(135deg, rgba(168,255,0,0.03) 0%, rgba(0,212,255,0.03) 100%)',
              boxShadow: '0 0 20px rgba(168,255,0,0.05)',
            }}
          >
            <h3
              className="text-xs font-bold tracking-[2px] mb-3"
              style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
            >
              さらに深い分析を見る
            </h3>
            <div className="flex flex-col gap-2 mb-4">
              {[
                '具体的なアクション提案',
                '発言の矛盾・盲点の指摘',
                '思考パターン分析',
                '3〜5セクションの詳細構造化',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-neon-lime text-[10px]">+</span>
                  <span className="text-[10px] text-hud-white opacity-60 tracking-wide">{feature}</span>
                </div>
              ))}
            </div>
            <button
              className="w-full py-2.5 rounded text-[10px] font-bold tracking-[2px] border-0 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(168,255,0,0.15) 0%, rgba(168,255,0,0.05) 100%)',
                color: 'var(--neon-lime)',
                textShadow: '0 0 8px rgba(168,255,0,0.3)',
              }}
            >
              Standardプランで詳細分析 &rarr;
            </button>
          </div>
        )}

        {/* Back button */}
        <div className="mt-4 flex justify-center">
          <NeonButton onClick={() => router.push('/')}>BACK TO HOME</NeonButton>
        </div>
      </div>
    </div>
  );
}
