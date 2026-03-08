'use client';

import useNetworkStatus from '@/hooks/useNetworkStatus';

export default function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-2"
      style={{
        background: 'rgba(255,59,122,0.9)',
      }}
    >
      <span className="text-[10px] tracking-[2px] text-white font-bold">
        OFFLINE — 接続を確認してください
      </span>
    </div>
  );
}
