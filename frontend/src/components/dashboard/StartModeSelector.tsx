'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessDialogue, hasFreeSessions, getFeedbackScore } from '@/lib/session-tracker';
import GlassCard from '@/components/ui/GlassCard';

export default function StartModeSelector() {
  const router = useRouter();
  const { profile } = useAuth();
  const [canRecord, setCanRecord] = useState(true);
  const [dialogueLocked, setDialogueLocked] = useState(false);
  const [showDialogueLock, setShowDialogueLock] = useState(false);

  const plan = profile?.plan || 'free';
  const freeSessionsUsed = profile?.free_sessions_used || 0;

  useEffect(() => {
    setCanRecord(hasFreeSessions(plan, freeSessionsUsed));
    setDialogueLocked(!canAccessDialogue(plan, freeSessionsUsed));
  }, [plan, freeSessionsUsed]);

  const feedbackScore = getFeedbackScore();

  return (
    <div className="flex items-center justify-center gap-8 py-8">
      {/* Record Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => {
            if (canRecord) {
              router.push('/record');
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
            opacity: canRecord ? 1 : 0.4,
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
          目的なしの整理
        </span>
      </div>

      {/* Dialogue Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => {
            if (!dialogueLocked) {
              router.push('/dialogue');
            } else {
              setShowDialogueLock(true);
            }
          }}
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
            opacity: dialogueLocked ? 0.4 : 1,
          }}
        >
          <span
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-6px',
              border: '1px dashed rgba(255,59,122,0.3)',
              borderRadius: '50%',
              animation: dialogueLocked ? 'none' : 'rotate-ring 20s linear infinite reverse',
            }}
          />
          {dialogueLocked && (
            <span className="absolute z-10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,59,122,0.6)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </span>
          )}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--neon-magenta)"
            strokeWidth="2"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,59,122,0.4))',
              opacity: dialogueLocked ? 0.3 : 1,
            }}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span
            className="text-[9px] font-bold tracking-[3px] text-neon-magenta"
            style={{
              textShadow: '0 0 8px rgba(255,59,122,0.3)',
              opacity: dialogueLocked ? 0.5 : 1,
            }}
          >
            DIALOGUE
          </span>
        </button>
        <span className="text-[9px] text-hud-white-dim tracking-[1px]">
          目的ありの整理
        </span>
      </div>

      {/* Dialogue Lock Modal */}
      {showDialogueLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,26,0.9)]">
          <GlassCard
            className="mx-5 max-w-sm p-6"
            variant={feedbackScore !== null && feedbackScore >= 3 ? 'lime' : 'default'}
          >
            {feedbackScore !== null && feedbackScore >= 3 ? (
              <>
                <h3
                  className="text-sm font-bold tracking-[2px] mb-3"
                  style={{ color: 'var(--neon-lime)', textShadow: '0 0 8px rgba(168,255,0,0.3)' }}
                >
                  プランをアップグレード
                </h3>
                <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-4">
                  対話モードを含む全機能をお使いいただけます。
                </p>

                {/* Lite Plan */}
                <div className="border border-[rgba(0,212,255,0.2)] rounded-lg p-3 mb-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-[2px] text-neon-cyan">Lite</span>
                    <span className="text-sm font-bold text-hud-white">
                      ¥580 <span className="text-[9px] text-hud-white-dim">/ 月</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {['月15回の録音', '詳細分析レポート', '永久保存'].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-neon-cyan text-[9px]">&#10003;</span>
                        <span className="text-[9px] text-hud-white opacity-60">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Standard Plan */}
                <div className="border border-[rgba(168,255,0,0.3)] rounded-lg p-3 mb-4" style={{ background: 'rgba(168,255,0,0.03)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-[2px] text-neon-lime">Standard</span>
                    <span className="text-sm font-bold text-hud-white">
                      ¥1,480 <span className="text-[9px] text-hud-white-dim">/ 月</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {['無制限の録音', '詳細分析レポート', 'AI対話モード', '月次分析レポート', '永久保存'].map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-neon-lime text-[9px]">&#10003;</span>
                        <span className="text-[9px] text-hud-white opacity-60">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[9px] text-neon-lime opacity-50 tracking-[1px] text-center mb-4">
                  近日公開
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold tracking-[2px] text-hud-white mb-3">
                  対話モード
                </h3>
                <p className="text-xs leading-6 text-hud-white opacity-70 tracking-wide mb-4">
                  対話モードは Standard プランでご利用いただけます。
                  まずは録音モードで Kataru を体験してみてください。
                </p>
              </>
            )}
            <button
              onClick={() => setShowDialogueLock(false)}
              className="w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(232,237,245,0.15)] rounded py-2 cursor-pointer"
            >
              閉じる
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
