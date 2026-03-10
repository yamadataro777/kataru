'use client';

import { useRef, useEffect } from 'react';

interface CircularEqualizerProps {
  frequencyData: number[];
  size?: number;
  rotationDeg?: number;
  maxBarHeightMultiplier?: number;
  energy?: number;
}

export default function CircularEqualizer({
  frequencyData,
  size = 240,
  rotationDeg = 0,
  maxBarHeightMultiplier = 1.0,
  energy = 0,
}: CircularEqualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = 34;
    const maxBarHeight = (size / 2 - innerRadius - 10) * maxBarHeightMultiplier;
    const barCount = 64;

    ctx.clearRect(0, 0, size, size);

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const value = frequencyData[i] || 0;
      const barHeight = Math.max(4, value * maxBarHeight * (0.86 + energy * 0.5));

      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

      // Color gradient from cyan to magenta
      const t = i / barCount;
      const r = Math.round(t * 255);
      const g = Math.round(212 - t * 153);
      const b = Math.round(255 - t * 133);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 2.2 + value * 1.8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      if (value > 0.25) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + energy * 0.38})`;
        ctx.lineWidth = 6.5;
        ctx.stroke();
      }
    }

    // Center ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 212, 255, ${0.24 + energy * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius + 10);
    gradient.addColorStop(0, `rgba(0, 212, 255, ${0.12 + energy * 0.24})`);
    gradient.addColorStop(0.5, `rgba(255, 59, 122, ${0.08 + energy * 0.16})`);
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius + 10, 0, Math.PI * 2);
    ctx.fill();
  }, [frequencyData, size, maxBarHeightMultiplier, energy]);

  return (
    <div
      style={{
        transform: `rotate(${rotationDeg}deg)`,
        width: size,
        height: size,
        transition: 'transform 0.25s linear',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  );
}
