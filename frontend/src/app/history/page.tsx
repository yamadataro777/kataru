import { Suspense } from 'react';
import HistoryClient from './HistoryClient';

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <span
            className="text-xs tracking-[3px] text-neon-cyan"
            style={{ animation: 'neon-flicker 2s ease infinite' }}
          >
            LOADING...
          </span>
        </div>
      }
    >
      <HistoryClient />
    </Suspense>
  );
}
