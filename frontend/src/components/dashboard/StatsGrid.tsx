'use client';

interface StatsGridProps {
  totalSessions: number;
  totalWords: number;
  avgDuration: number;
  totalDuration: number;
}

export default function StatsGrid({ totalSessions = 0, totalWords = 0, avgDuration = 0 }: StatsGridProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const stats = [
    { value: totalSessions, label: 'SESSIONS', color: 'var(--neon-cyan)', glow: 'rgba(0,212,255,0.3)', borderColor: 'rgba(0,212,255,0.1)', bgColor: 'rgba(0,212,255,0.03)' },
    { value: totalWords.toLocaleString(), label: 'WORDS', color: 'var(--neon-magenta)', glow: 'rgba(255,59,122,0.3)', borderColor: 'rgba(255,59,122,0.1)', bgColor: 'rgba(255,59,122,0.03)' },
    { value: formatDuration(avgDuration), label: 'AVG TIME', color: 'var(--neon-lime)', glow: 'rgba(168,255,0,0.3)', borderColor: 'rgba(168,255,0,0.1)', bgColor: 'rgba(168,255,0,0.03)' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-3 text-center rounded-lg"
          style={{
            border: `1px solid ${stat.borderColor}`,
            background: stat.bgColor,
          }}
        >
          <div
            className="text-xl font-bold"
            style={{ color: stat.color, textShadow: `0 0 10px ${stat.glow}` }}
          >
            {stat.value}
          </div>
          <div className="text-[8px] tracking-[2px] text-hud-white-dim mt-1 uppercase">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
