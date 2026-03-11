import GlassCard from '@/components/ui/GlassCard';
import { TopicCount } from '@/lib/api';

interface RecurringThemesProps {
  topicCounts: TopicCount[];
}

const BADGE_COLORS = [
  { border: 'rgba(168,255,0,0.4)', bg: 'rgba(168,255,0,0.1)', text: 'var(--neon-lime)' },
  { border: 'rgba(0,212,255,0.4)', bg: 'rgba(0,212,255,0.1)', text: 'var(--neon-cyan)' },
  { border: 'rgba(255,59,122,0.4)', bg: 'rgba(255,59,122,0.1)', text: 'var(--neon-magenta)' },
];

export default function RecurringThemes({ topicCounts }: RecurringThemesProps) {
  const recurring = topicCounts.filter((t) => t.count >= 2);
  const oneTime = topicCounts.filter((t) => t.count === 1);

  if (topicCounts.length === 0) {
    return (
      <GlassCard className="p-4" variant="lime">
        <span className="label label-lime mb-1 block">RECURRING THEMES</span>
        <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
          繰り返しのテーマ
        </span>
        <p className="text-[12px] text-hud-white-dim" style={{ fontFamily: 'sans-serif' }}>
          セッションが増えると、関心テーマが見えてきます
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4" variant="lime">
      <span className="label label-lime mb-1 block">RECURRING THEMES</span>
      <span className="block text-[11px] text-hud-white-dim mb-3" style={{ fontFamily: 'sans-serif' }}>
        繰り返しのテーマ
      </span>

      {recurring.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {recurring.map((t, i) => {
            const color = BADGE_COLORS[i % BADGE_COLORS.length];
            return (
              <span
                key={t.topic}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px]"
                style={{
                  border: `1px solid ${color.border}`,
                  background: color.bg,
                  color: color.text,
                  fontFamily: 'sans-serif',
                }}
              >
                {t.topic} ×{t.count}
              </span>
            );
          })}
        </div>
      )}

      {oneTime.length > 0 && (
        <>
          {recurring.length > 0 && (
            <span className="block text-[10px] text-hud-white-dim tracking-[1px] mb-2">
              その他のトピック
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {oneTime.map((t) => (
              <span
                key={t.topic}
                className="px-2 py-1 rounded-full text-[10px] tracking-[1px]"
                style={{
                  border: '1px solid rgba(232,237,245,0.15)',
                  background: 'rgba(232,237,245,0.04)',
                  color: 'var(--white-dim)',
                  fontFamily: 'sans-serif',
                }}
              >
                {t.topic}
              </span>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
