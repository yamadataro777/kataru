'use client';

import GlassCard from '@/components/ui/GlassCard';

interface ReportSectionProps {
  heading: string;
  content: string;
}

export default function ReportSection({ heading, content }: ReportSectionProps) {
  return (
    <GlassCard className="p-4" variant="cyan">
      <h3
        className="text-xs font-bold tracking-[3px] uppercase text-neon-cyan mb-3"
        style={{ textShadow: '0 0 10px rgba(0,212,255,0.3)' }}
      >
        {heading}
      </h3>
      <p className="text-sm leading-7 text-hud-white opacity-90 tracking-wide">
        {content}
      </p>
    </GlassCard>
  );
}
