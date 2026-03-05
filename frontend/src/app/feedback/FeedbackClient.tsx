'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import { submitFeedback } from '@/lib/api';
import { setFeedbackCompleted, getDeviceId } from '@/lib/session-tracker';

type Step = 'rating' | 'satisfied' | 'unsatisfied' | 'thankyou';

export default function FeedbackClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('rating');
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (step === 'thankyou') {
      const timer = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  const handleRatingSubmit = () => {
    if (score === null) return;

    submitFeedback({
      score,
      comment: comment || undefined,
      device_id: getDeviceId(),
    }).catch(() => {});

    setFeedbackCompleted(score);

    if (score >= 3) {
      setStep('satisfied');
    } else {
      setStep('unsatisfied');
    }
  };

  const handleSuggestionSubmit = () => {
    submitFeedback({
      score: score!,
      suggestion: suggestion || undefined,
      device_id: getDeviceId(),
    }).catch(() => {});

    setStep('thankyou');
  };

  // === Rating Step ===
  if (step === 'rating') {
    return (
      <div className="flex flex-col min-h-dvh px-5 py-8">
        <div className="flex-shrink-0">
          <span className="label">FEEDBACK</span>
          <div className="hud-line mt-2" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <h1
            className="text-xl font-bold tracking-[2px] text-hud-white text-center"
            style={{ animation: 'glitch-in 0.4s ease forwards' }}
          >
            サービスはいかがでしたか？
          </h1>

          <GlassCard className="p-6 w-full max-w-sm" variant="cyan">
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 text-sm font-bold tracking-[1px]"
                  style={{
                    borderColor: score === n ? 'var(--neon-cyan)' : 'rgba(0,212,255,0.25)',
                    background: score === n ? 'rgba(0,212,255,0.15)' : 'transparent',
                    color: score === n ? 'var(--neon-cyan)' : 'rgba(232,237,245,0.5)',
                    boxShadow: score === n ? '0 0 15px rgba(0,212,255,0.3)' : 'none',
                    transform: score === n ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-1 mb-6">
              <span className="text-[9px] text-hud-white-dim tracking-[1px]">改善の余地あり</span>
              <span className="text-[9px] text-hud-white-dim tracking-[1px]">とても満足</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ご意見があればお聞かせください（任意）"
              className="w-full h-20 bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.15)] rounded-lg p-3 text-xs text-hud-white placeholder:text-hud-white-dim tracking-wide resize-none focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
            />
          </GlassCard>

          <NeonButton onClick={handleRatingSubmit} disabled={score === null}>
            送信
          </NeonButton>
        </div>
      </div>
    );
  }

  // === Satisfied Step (score >= 3) — 3-tier plan display ===
  if (step === 'satisfied') {
    return (
      <div className="flex flex-col min-h-dvh px-5 py-8">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full border-2 border-neon-lime flex items-center justify-center mx-auto mb-4"
              style={{ boxShadow: '0 0 20px rgba(168,255,0,0.3)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--neon-lime)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1
              className="text-xl font-bold tracking-[2px] text-neon-lime"
              style={{ textShadow: '0 0 15px rgba(168,255,0,0.4)' }}
            >
              ありがとうございます！
            </h1>
            <p className="text-xs text-hud-white-dim tracking-wide mt-2">
              Kataruをお気に入りいただけて嬉しいです
            </p>
          </div>

          {/* Lite Plan */}
          <GlassCard className="p-5 w-full max-w-sm" variant="cyan">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm font-bold tracking-[2px] text-neon-cyan" style={{ textShadow: '0 0 8px rgba(0,212,255,0.3)' }}>
                Lite プラン
              </span>
              <span className="text-lg font-bold text-hud-white">
                ¥580 <span className="text-[10px] text-hud-white-dim">/ 月</span>
              </span>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {['月15回の録音セッション', '詳細分析レポート・アクション提案', 'レポート永久保存'].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-neon-cyan text-xs flex-shrink-0">&#10003;</span>
                  <span className="text-[10px] text-hud-white opacity-70 tracking-wide">{feature}</span>
                </div>
              ))}
            </div>
            <NeonButton variant="cyan" onClick={() => setStep('thankyou')} className="w-full">
              Lite に登録
            </NeonButton>
            <p className="text-[9px] text-neon-cyan opacity-50 tracking-[1px] text-center mt-2">近日公開</p>
          </GlassCard>

          {/* Standard Plan */}
          <GlassCard className="p-5 w-full max-w-sm" variant="lime">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-sm font-bold tracking-[2px] text-neon-lime" style={{ textShadow: '0 0 8px rgba(168,255,0,0.3)' }}>
                Standard プラン
              </span>
              <span className="text-lg font-bold text-hud-white">
                ¥1,480 <span className="text-[10px] text-hud-white-dim">/ 月</span>
              </span>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {[
                '無制限の録音セッション',
                '詳細分析レポート・アクション提案',
                'AI対話モード',
                '月次分析レポート',
                'レポート永久保存',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-neon-lime text-xs flex-shrink-0">&#10003;</span>
                  <span className="text-[10px] text-hud-white opacity-70 tracking-wide">{feature}</span>
                </div>
              ))}
            </div>
            <NeonButton variant="lime" onClick={() => setStep('thankyou')} className="w-full">
              Standard に登録
            </NeonButton>
            <p className="text-[9px] text-neon-lime opacity-50 tracking-[1px] text-center mt-2">近日公開</p>
          </GlassCard>

          <button
            onClick={() => setStep('thankyou')}
            className="text-[10px] text-hud-white-dim tracking-[1px] bg-transparent border-0 cursor-pointer underline underline-offset-4 decoration-[rgba(232,237,245,0.2)]"
          >
            スキップして無料で続ける
          </button>
        </div>
      </div>
    );
  }

  // === Unsatisfied Step (score <= 2) ===
  if (step === 'unsatisfied') {
    return (
      <div className="flex flex-col min-h-dvh px-5 py-8">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-[2px] text-hud-white">
              貴重なご意見をありがとうございます
            </h1>
            <p className="text-xs text-hud-white-dim tracking-wide mt-2">
              改善に役立てさせていただきます
            </p>
          </div>

          <GlassCard className="p-6 w-full max-w-sm" variant="magenta">
            <span className="label label-magenta mb-3 block">改善のご提案</span>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="どのような点を改善すべきでしょうか？"
              className="w-full h-28 bg-[rgba(255,59,122,0.03)] border border-[rgba(255,59,122,0.15)] rounded-lg p-3 text-xs text-hud-white placeholder:text-hud-white-dim tracking-wide resize-none focus:outline-none focus:border-[rgba(255,59,122,0.4)]"
            />
            <div className="mt-4">
              <NeonButton variant="magenta" onClick={handleSuggestionSubmit} className="w-full">
                送信
              </NeonButton>
            </div>
          </GlassCard>

          <button
            onClick={() => setStep('thankyou')}
            className="text-[10px] text-hud-white-dim tracking-[1px] bg-transparent border-0 cursor-pointer underline underline-offset-4 decoration-[rgba(232,237,245,0.2)]"
          >
            スキップ
          </button>
        </div>
      </div>
    );
  }

  // === Thank You Step ===
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-8 px-8">
      <div
        className="w-20 h-20 rounded-full border-2 border-neon-cyan flex items-center justify-center"
        style={{
          boxShadow: '0 0 25px rgba(0,212,255,0.3)',
          animation: 'rec-pulse 2s ease infinite',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1
        className="text-2xl font-bold tracking-[4px] text-neon-cyan"
        style={{
          textShadow: '0 0 20px rgba(0,212,255,0.4)',
          animation: 'neon-flicker 3s ease infinite',
        }}
      >
        THANK YOU
      </h1>
      <p className="text-xs text-hud-white-dim tracking-wide">
        ご協力ありがとうございました
      </p>
      <NeonButton onClick={() => router.push('/')}>
        ホームに戻る
      </NeonButton>
    </div>
  );
}
