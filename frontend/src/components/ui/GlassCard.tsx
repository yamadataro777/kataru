'use client';

import { ReactNode } from 'react';
import HudCorners from './HudCorners';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'cyan' | 'magenta' | 'lime' | 'default';
  hudCorners?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = '',
  variant = 'default',
  hudCorners = false,
  onClick,
}: GlassCardProps) {
  const borderColors = {
    cyan: 'border-[rgba(0,212,255,0.25)] shadow-[inset_0_0_20px_rgba(0,212,255,0.05),0_0_15px_rgba(0,212,255,0.08)]',
    magenta: 'border-[rgba(255,59,122,0.25)] shadow-[inset_0_0_20px_rgba(255,59,122,0.05),0_0_15px_rgba(255,59,122,0.08)]',
    lime: 'border-[rgba(168,255,0,0.25)] shadow-[inset_0_0_20px_rgba(168,255,0,0.05),0_0_15px_rgba(168,255,0,0.08)]',
    default: 'border-glass-border',
  };

  return (
    <div
      className={`relative bg-glass backdrop-blur-[20px] border rounded-xl ${borderColors[variant]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {hudCorners && <HudCorners />}
      {children}
    </div>
  );
}
