'use client';

import NeonButton from '@/components/ui/NeonButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <p
        className="text-[10px] tracking-[3px] mb-4"
        style={{ color: 'var(--neon-magenta)' }}
      >
        ERROR
      </p>
      <h2
        className="text-sm tracking-[1px] mb-2"
        style={{ color: 'var(--hud-white)' }}
      >
        予期しないエラーが発生しました
      </h2>
      <p className="text-[10px] tracking-[1px] text-hud-white-dim mb-6 max-w-xs leading-5">
        {error.message || 'アプリでエラーが発生しました。再試行してください。'}
      </p>
      <NeonButton onClick={reset} className="w-full max-w-xs">
        再試行
      </NeonButton>
    </div>
  );
}
