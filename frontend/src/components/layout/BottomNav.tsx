'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'HOME',
    path: '/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'RECORD',
    path: '/record',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
{
    label: 'ARCHIVE',
    path: '/archive',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="flex-shrink-0 flex justify-around items-center"
      style={{
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 -5px 30px rgba(0,212,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '6px',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`
              relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg
              transition-all duration-200 cursor-pointer border-0 bg-transparent
              ${isActive ? 'bg-[rgba(0,212,255,0.08)]' : ''}
            `}
          >
            {isActive && (
              <span
                className="absolute -top-[1px] left-[15%] right-[15%] h-[2px] rounded-b-sm"
                style={{
                  background: 'var(--neon-cyan)',
                  boxShadow: '0 0 8px var(--neon-cyan)',
                }}
              />
            )}
            <span
              className={`transition-opacity duration-200 ${isActive ? 'opacity-100 text-neon-cyan' : 'opacity-50 text-hud-white'}`}
            >
              {item.icon}
            </span>
            <span
              className={`text-[8px] tracking-[1px] transition-colors duration-200 ${
                isActive ? 'text-neon-cyan' : 'text-hud-white-dim'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
