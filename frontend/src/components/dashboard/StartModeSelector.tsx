'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasFreeSessions } from '@/lib/session-tracker';

export default function StartModeSelector() {
  const router = useRouter();
  const [canRecord, setCanRecord] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    setCanRecord(hasFreeSessions());
  }, []);

  return (
    <div className="flex items-center justify-center gap-8 py-8">
      {/* Record Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => {
            if (canRecord) {
              router.push('/record');
            } else {
              setShowPaywall(true);
            }
          }}
          className="
            relative w-[120px] h-[120px] rounded-full
            border-2 border-neon-cyan
            bg-[rgba(0,212,255,0.05)]
            flex flex-col items-center justify-center gap-1.5
            cursor-pointer transition-all duration-300
            active:scale-95
          "
          style={{
            boxShadow: '0 0 20px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.05)',
          }}
        >
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-6px',
              border: '1px dashed rgba(0,212,255,0.3)',
              borderRadius: '50%',
              animation: 'rotate-ring 20s linear infinite',
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.4))' }}
          >
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[3px] text-neon-cyan"
            style={{ textShadow: '0 0 8px rgba(0,212,255,0.3)' }}
          >
            RECORD
          </span>
        </button>
        <span className="text-[9px] text-hud-white-dim tracking-[1px]">
          録音→AIレポート生成
        </span>
      </div>

      {/* Dialogue Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => router.push('/dialogue')}
          className="
            relative w-[120px] h-[120px] rounded-full
            border-2 border-neon-magenta
            bg-[rgba(255,59,122,0.05)]
            flex flex-col items-center justify-center gap-1.5
            cursor-pointer transition-all duration-300
            active:scale-95
          "
          style={{
            boxShadow: '0 0 20px rgba(255,59,122,0.15), inset 0 0 20px rgba(255,59,122,0.05)',
          }}
        >
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-6px',
              border: '1px dashed rgba(255,59,122,0.3)',
              borderRadius: '50%',
              animation: 'rotate-ring 20s linear infinite reverse',
            }}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neon-magenta)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,59,122,0.4))' }}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[3px] text-neon-magenta"
            style={{ textShadow: '0 0 8px rgba(255,59,122,0.3)' }}
          >
            DIALOGUE
          </span>
        </button>
        <span className="text-[9px] text-hud-white-dim tracking-[1px]">
          AIと対話で思考を深掘り
        </span>
      </div>
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,26,0.9)]">
          <div
            className="mx-5 max-w-sm rounded-lg border border-[rgba(0,212,255,0.2)] bg-[#0A0E1A] p-6"
            style={{ boxShadow: '0 0 40px rgba(0,212,255,0.1)' }}
          >
            <h3 className="text-sm font-bold tracking-[2px] text-neon-cyan mb-3">
              無料トライアル終了
            </h3>
            <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-4">
              Standardプラン（月額¥1,480）で、毎月15回の録音・詳細レポート・対話モードが使えます。
            </p>
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-neon-lime text-xs">&#10003;</span>
                <span className="text-[10px] text-hud-white opacity-60 tracking-wide">月15回の録音セッション</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neon-lime text-xs">&#10003;</span>
                <span className="text-[10px] text-hud-white opacity-60 tracking-wide">詳細分析レポート・アクション提案</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neon-lime text-xs">&#10003;</span>
                <span className="text-[10px] text-hud-white opacity-60 tracking-wide">AI対話モード</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neon-lime text-xs">&#10003;</span>
                <span className="text-[10px] text-hud-white opacity-60 tracking-wide">レポート永久保存</span>
              </div>
            </div>
            <p className="text-[9px] text-neon-cyan opacity-50 tracking-[1px] text-center mb-4">
              近日公開
            </p>
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
