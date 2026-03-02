'use client';

import GlassCard from '@/components/ui/GlassCard';
import { TopicCount } from '@/lib/api';

interface MonthlyInsightProps {
  topicCounts: TopicCount[];
  monthlySessionCount: number;
}

export default function MonthlyInsight({ topicCounts, monthlySessionCount }: MonthlyInsightProps) {
  const monthName = new Date().toLocaleDateString('ja-JP', { month: 'long' });

  const generateInsight = (): string => {
    if (monthlySessionCount === 0) return '';
    const topTopics = topicCounts.slice(0, 3).map((t) => `「${t.topic}」`);
    if (topTopics.length === 0) {
      return `${monthName}は${monthlySessionCount}回のセッションを記録しています。`;
    }
    return `${monthName}は主に${topTopics.join('と')}について考えています。`;
  };

  const insight = generateInsight();

  return (
    <GlassCard className="p-4" variant="cyan" hudCorners>
      <span className="label mb-1 block">MONTHLY INSIGHT</span>
      <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
        今月のサマリー
      </span>
      {monthlySessionCount === 0 ? (
        <p className="text-[12px] text-hud-white-dim" style={{ fontFamily: 'sans-serif' }}>
          最初のセッションを録音すると、思考サマリーが表示されます
        </p>
      ) : (
        <>
          <p
            className="text-[13px] leading-relaxed text-hud-white"
            style={{ fontFamily: 'sans-serif', opacity: 0.9 }}
          >
            {insight}
          </p>
          <div className="mt-3 pt-3 border-t border-glass-border">
            <span className="text-[10px] tracking-[2px] text-neon-cyan opacity-70">
              {monthlySessionCount} SESSION{monthlySessionCount !== 1 ? 'S' : ''} THIS MONTH
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}
