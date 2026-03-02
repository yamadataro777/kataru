'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConversation } from '@/lib/api';
import { Conversation } from '@/types/conversation';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import TopicTags from '@/components/report/TopicTags';
import KeyInsights from '@/components/report/KeyInsights';
import ReportSection from '@/components/report/ReportSection';

export default function DialogueResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }

    getConversation(id)
      .then(setConversation)
      .catch(() => setConversation(null))
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

  if (!conversation || !conversation.final_report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-8">
        <p className="text-xs tracking-[2px] text-hud-white-dim">CONVERSATION NOT FOUND</p>
        <NeonButton onClick={() => router.push('/')}>BACK TO HOME</NeonButton>
      </div>
    );
  }

  const report = conversation.final_report;

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
        <span className="label">DIALOGUE REPORT</span>
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
        {report.topics.length > 0 && (
          <div>
            <span className="label mb-2 block">TOPICS</span>
            <TopicTags topics={report.topics} />
          </div>
        )}

        {/* Key Insights */}
        {report.key_insights.length > 0 && (
          <KeyInsights insights={report.key_insights} />
        )}

        {/* Emotional Journey */}
        {report.emotional_journey && (
          <GlassCard className="p-4" variant="magenta">
            <span className="label label-magenta mb-2 block">EMOTIONAL JOURNEY</span>
            <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
              {report.emotional_journey}
            </p>
          </GlassCard>
        )}

        {/* Patterns Discovered */}
        {report.patterns_discovered.length > 0 && (
          <GlassCard className="p-4">
            <span className="label mb-3 block">PATTERNS</span>
            <div className="flex flex-col gap-2">
              {report.patterns_discovered.map((pattern, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-neon-cyan text-xs flex-shrink-0">&#9656;</span>
                  <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
                    {pattern}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Identity Narrative */}
        {report.identity_narrative && (
          <GlassCard className="p-4" variant="cyan">
            <span className="label mb-2 block">IDENTITY</span>
            <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
              {report.identity_narrative}
            </p>
          </GlassCard>
        )}

        {/* Report Sections */}
        {report.structure.sections.map((section, i) => (
          <ReportSection key={i} heading={section.heading} content={section.content} />
        ))}

        {/* Growth Areas */}
        {report.growth_areas.length > 0 && (
          <GlassCard className="p-4" variant="lime">
            <span className="label label-lime mb-3 block">GROWTH AREAS</span>
            <div className="flex flex-col gap-2">
              {report.growth_areas.map((area, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-neon-lime text-xs flex-shrink-0">&#9656;</span>
                  <p className="text-sm leading-6 text-hud-white opacity-85 tracking-wide">
                    {area}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Action Items */}
        {report.action_items.length > 0 && (
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

        {/* Back button */}
        <div className="mt-4 flex justify-center">
          <NeonButton onClick={() => router.push('/')}>BACK TO HOME</NeonButton>
        </div>
      </div>
    </div>
  );
}
