'use client';

import { useRef, useEffect } from 'react';

interface CircularEqualizerProps {
  frequencyData: number[];
  size?: number;
}

export default function CircularEqualizer({ frequencyData, size = 240 }: CircularEqualizerProps) {
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
    const innerRadius = 35;
    const maxBarHeight = size / 2 - innerRadius - 10;
    const barCount = 64;

    ctx.clearRect(0, 0, size, size);

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const value = frequencyData[i] || 0;
      const barHeight = Math.max(4, value * maxBarHeight);

      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

      // Color gradient from cyan to magenta
      const t = i / barCount;
      const r = Math.round(0 + t * 255);
      const g = Math.round(212 - t * 153);
      const b = Math.round(255 - t * 133);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      if (value > 0.3) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [frequencyData, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block"
    />
  );
}
