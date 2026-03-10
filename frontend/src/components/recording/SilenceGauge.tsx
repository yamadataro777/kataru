'use client';

interface SilenceGaugeProps {
  progress: number; // 0-1
  size?: number;
}

export default function SilenceGauge({ progress, size = 240 }: SilenceGaugeProps) {
  const c = size / 2;
  const r = 115;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  // Glow intensifies as progress approaches 1
  const glowOpacity = progress > 0 ? 0.3 + progress * 0.7 : 0;
  const filterGlow = progress > 0.8
    ? `drop-shadow(0 0 ${4 + (progress - 0.8) * 30}px rgba(0,212,255,${0.4 + progress * 0.4}))`
    : 'none';

  return (
    <svg
      width={size}
      height={size}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {/* Background guide ring */}
      <circle
        cx={c}
        cy={c}
        r={r}
        stroke="rgba(0,212,255,0.08)"
        fill="none"
        strokeWidth={2}
      />
      {/* Progress ring */}
      <circle
        cx={c}
        cy={c}
        r={r}
        stroke="#00D4FF"
        fill="none"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
        style={{
          transition: 'stroke-dashoffset 0.3s linear, opacity 0.3s ease',
          opacity: glowOpacity,
          filter: filterGlow,
        }}
      />
    </svg>
  );
}
