'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { getAnalytics } from '@/lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalWords: 0,
    avgDuration: 0,
    totalDuration: 0,
    recentTopics: [] as string[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="flex flex-col min-h-dvh">
      <Header />

      <div className="flex-1 px-5 pb-20">
        <div className="mt-4 mb-5">
          <span className="label">DATA ANALYSIS</span>
          <h2 className="text-lg font-bold tracking-[2px] mt-1">Analytics</h2>
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
        ) : (
          <div className="flex flex-col gap-4">
            <StatsGrid
              totalSessions={analytics.totalSessions}
              totalWords={analytics.totalWords}
              avgDuration={analytics.avgDuration}
              totalDuration={analytics.totalDuration}
            />

            {/* Total recording time */}
            <GlassCard className="p-4" variant="cyan" hudCorners>
              <span className="label mb-2 block">TOTAL RECORDING TIME</span>
              <div
                className="text-3xl font-bold text-neon-cyan tracking-[4px]"
                style={{ textShadow: '0 0 15px rgba(0,212,255,0.4)' }}
              >
                {formatDuration(analytics.totalDuration)}
              </div>
            </GlassCard>

            {/* Recent topics */}
            {analytics.recentTopics.length > 0 && (
              <GlassCard className="p-4" variant="magenta">
                <span className="label label-magenta mb-3 block">FREQUENT TOPICS</span>
                <div className="flex flex-wrap gap-2">
                  {analytics.recentTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[2px] uppercase"
                      style={{
                        border: '1px solid rgba(255,59,122,0.3)',
                        background: 'rgba(255,59,122,0.08)',
                        color: 'var(--neon-magenta)',
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Placeholder charts */}
            <GlassCard className="p-4" variant="cyan">
              <span className="label mb-3 block">SESSIONS OVER TIME</span>
              <div className="h-32 flex items-end justify-around gap-1 px-2">
                {[0.3, 0.5, 0.2, 0.8, 0.6, 0.9, 0.4, 0.7, 0.5, 0.3, 0.6, 0.8].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h * 100}%`,
                      background: `linear-gradient(180deg, var(--neon-cyan), rgba(0,212,255,0.2))`,
                      boxShadow: '0 0 4px rgba(0,212,255,0.3)',
                      opacity: 0.7 + h * 0.3,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[8px] text-hud-white-dim tracking-[1px]">
                <span>JAN</span>
                <span>FEB</span>
                <span>MAR</span>
                <span>APR</span>
                <span>MAY</span>
                <span>JUN</span>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <span className="label label-lime mb-3 block">SENTIMENT TRENDS</span>
              <div className="h-20 flex items-center justify-center">
                <p className="text-[10px] tracking-[2px] text-hud-white-dim">
                  CHART AVAILABLE WITH MORE DATA
                </p>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
