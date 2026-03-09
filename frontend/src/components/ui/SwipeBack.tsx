'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

const DISABLED_PATHS = ['/', '/history', '/analytics'];

const EDGE_THRESHOLD = 25;
const SWIPE_THRESHOLD = 80;

export default function SwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [deltaX, setDeltaX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const swipeRef = useRef({ startX: 0, startY: 0, isSwiping: false });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (DISABLED_PATHS.includes(pathname)) return;
    const touch = e.touches[0];
    if (touch.clientX < EDGE_THRESHOLD) {
      swipeRef.current = { startX: touch.clientX, startY: touch.clientY, isSwiping: true };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current.isSwiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeRef.current.startX;
    const dy = Math.abs(touch.clientY - swipeRef.current.startY);

    // Cancel if vertical movement exceeds horizontal
    if (dy > Math.abs(dx)) {
      swipeRef.current.isSwiping = false;
      setDeltaX(0);
      return;
    }

    if (dx > 0) {
      setDeltaX(dx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swipeRef.current.isSwiping) return;
    swipeRef.current.isSwiping = false;

    if (deltaX > SWIPE_THRESHOLD) {
      setTransitioning(true);
      setDeltaX(window.innerWidth);
      setTimeout(() => {
        router.back();
        setDeltaX(0);
        setTransitioning(false);
      }, 250);
    } else {
      setTransitioning(true);
      setDeltaX(0);
      setTimeout(() => setTransitioning(false), 200);
    }
  }, [deltaX, router]);

  const isActive = deltaX > 0;
  const style: React.CSSProperties = isActive || transitioning
    ? {
        transform: `translateX(${deltaX}px)`,
        opacity: Math.max(0.5, 1 - deltaX / 400),
        transition: transitioning ? 'transform 0.25s ease-out, opacity 0.25s ease-out' : 'none',
        willChange: 'transform, opacity',
      }
    : {};

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={style}
    >
      {children}
    </div>
  );
}
