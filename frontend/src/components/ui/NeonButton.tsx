'use client';

import { ReactNode } from 'react';

interface NeonButtonProps {
  children: ReactNode;
  variant?: 'cyan' | 'magenta' | 'lime';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function NeonButton({
  children,
  variant = 'cyan',
  onClick,
  className = '',
  disabled = false,
}: NeonButtonProps) {
  const styles = {
    cyan: {
      border: 'border-neon-cyan',
      text: 'text-neon-cyan',
      bg: 'bg-[rgba(0,212,255,0.08)]',
      shadow: 'shadow-[0_0_15px_#00D4FF88,0_0_30px_#00D4FF44,inset_0_0_20px_rgba(0,212,255,0.1)]',
      shimmer: 'rgba(0,212,255,0.15)',
    },
    magenta: {
      border: 'border-neon-magenta',
      text: 'text-neon-magenta',
      bg: 'bg-[rgba(255,59,122,0.08)]',
      shadow: 'shadow-[0_0_15px_#FF3B7A88,0_0_30px_#FF3B7A44,inset_0_0_20px_rgba(255,59,122,0.1)]',
      shimmer: 'rgba(255,59,122,0.15)',
    },
    lime: {
      border: 'border-neon-lime',
      text: 'text-neon-lime',
      bg: 'bg-[rgba(168,255,0,0.08)]',
      shadow: 'shadow-[0_0_15px_#A8FF0088,0_0_30px_#A8FF0044,inset_0_0_20px_rgba(168,255,0,0.1)]',
      shimmer: 'rgba(168,255,0,0.15)',
    },
  };

  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center gap-2
        px-8 py-4 border rounded-lg
        font-mono text-sm font-bold
        tracking-[4px] uppercase
        cursor-pointer overflow-hidden
        transition-all duration-200
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${s.border} ${s.text} ${s.bg} ${s.shadow}
        ${className}
      `}
    >
      {children}
      <span
        className="absolute top-0 w-full h-full"
        style={{
          left: '-100%',
          background: `linear-gradient(90deg, transparent, ${s.shimmer}, transparent)`,
          animation: 'btn-shimmer 3s ease infinite',
        }}
      />
    </button>
  );
}
