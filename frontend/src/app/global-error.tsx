'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          fontFamily: "'Menlo', 'Courier New', monospace",
          background: '#0A0E1A',
          margin: 0,
        }}
      >
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              letterSpacing: '3px',
              color: '#FF3B7A',
              marginBottom: '16px',
            }}
          >
            SYSTEM ERROR
          </p>
          <h2
            style={{
              fontSize: '14px',
              letterSpacing: '1px',
              color: '#E8EDF5',
              marginBottom: '24px',
            }}
          >
            アプリでエラーが発生しました
          </h2>
          <button
            onClick={reset}
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.4)',
              color: '#00D4FF',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '10px',
              letterSpacing: '2px',
              cursor: 'pointer',
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
