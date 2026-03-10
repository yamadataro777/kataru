'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';
import HudCorners from '@/components/ui/HudCorners';
import { LP, CONTRASTS, CHATGPT_COMPARISON } from '@/lib/marketing-copy';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const HEALTH_FAST_TIMEOUT = 3000; // 3秒以内ならすぐ遷移

type ModalState = 'hidden' | 'checking' | 'waking' | 'waitlist-form';

export default function LandingPage() {
  const router = useRouter();
  const [modalState, setModalState] = useState<ModalState>('hidden');
  const [email, setEmail] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Pre-warm backend on landing page load (cold start mitigation)
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, []);

  const handleCTA = useCallback(async () => {
    // Fast health check — if server responds quickly, go straight to app
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setModalState('checking');

    const timeout = setTimeout(() => {
      // Server is slow (probably sleeping) — show waking modal
      setModalState('waking');
    }, HEALTH_FAST_TIMEOUT);

    try {
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        setModalState('hidden');
        router.push('/');
        return;
      }
    } catch {
      clearTimeout(timeout);
    }

    // If we're still in 'checking', switch to waking (fetch failed instantly)
    setModalState((prev) => (prev === 'checking' ? 'waking' : prev));

    // Keep polling in background — auto-redirect when server is up
    const poll = async () => {
      for (let i = 0; i < 20; i++) {
        if (controller.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const r = await fetch(`${API_URL}/health`, { signal: controller.signal });
          if (r.ok) {
            setModalState('hidden');
            router.push('/');
            return;
          }
        } catch { /* keep trying */ }
      }
    };
    poll();
  }, [router]);

  const closeModal = () => {
    abortRef.current?.abort();
    setModalState('hidden');
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just store in localStorage — later integrate with email service
    const existing = JSON.parse(localStorage.getItem('kataru_waitlist') || '[]');
    existing.push({ email, timestamp: new Date().toISOString() });
    localStorage.setItem('kataru_waitlist', JSON.stringify(existing));
    setWaitlistDone(true);
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* ── Header ── */}
      <header className="flex justify-between items-center px-5 py-3 flex-shrink-0">
        <h1
          className="text-xl font-black tracking-[6px] text-neon-cyan"
          style={{ textShadow: '0 0 20px rgba(0,212,255,0.5)' }}
        >
          KATARU
        </h1>
        <button
          onClick={() => router.push('/')}
          className="text-[10px] tracking-[2px] uppercase text-neon-cyan opacity-60 bg-transparent border border-[rgba(0,212,255,0.3)] rounded px-3 py-1.5 cursor-pointer hover:opacity-100 transition-opacity"
        >
          APP
        </button>
      </header>

      {/* ── Hero Section ── */}
      <section className="px-5 pt-8 pb-6">
        <div className="relative">
          {/* Decorative scan indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="w-1.5 h-1.5 rounded-full bg-neon-cyan"
              style={{ boxShadow: '0 0 6px #00D4FF', animation: 'rec-pulse 2s ease infinite' }}
            />
            <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
              THOUGHT STRUCTURING ENGINE
            </span>
          </div>

          {/* Headline */}
          <h2
            className="text-2xl font-black leading-tight tracking-wide"
            style={{ textShadow: '0 0 30px rgba(0,212,255,0.2)' }}
          >
            {LP.hero.headline}
          </h2>
          <h2
            className="text-2xl font-black leading-tight tracking-wide text-neon-cyan mt-1"
            style={{
              textShadow: '0 0 30px rgba(0,212,255,0.4)',
              animation: 'logo-pulse 4s ease infinite',
            }}
          >
            {LP.hero.headlineSub}
          </h2>

          {/* CTA */}
          <div className="mt-6">
            <NeonButton variant="cyan" onClick={handleCTA}>
              {LP.cta.primary}
            </NeonButton>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── Mode Showcase ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
            TWO MODES
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.15)]" />
        </div>

        {/* Record Mode */}
        <GlassCard variant="cyan" className="p-5 mb-4" hudCorners>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full border border-neon-cyan flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.05)', boxShadow: '0 0 15px rgba(0,212,255,0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <span className="text-[9px] tracking-[3px] text-neon-cyan opacity-70">
                {LP.modes.record.label}
              </span>
              <h3 className="text-sm font-bold tracking-wider">{LP.modes.record.title}</h3>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-hud-white-dim tracking-wide">
            {LP.modes.record.description}
          </p>
        </GlassCard>

        {/* Dialogue Mode — temporarily hidden
        <GlassCard variant="magenta" className="p-5" hudCorners>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full border border-neon-magenta flex items-center justify-center"
              style={{ background: 'rgba(255,59,122,0.05)', boxShadow: '0 0 15px rgba(255,59,122,0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-magenta)" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <span className="text-[9px] tracking-[3px] text-neon-magenta opacity-70">
                {LP.modes.dialogue.label}
              </span>
              <h3 className="text-sm font-bold tracking-wider">{LP.modes.dialogue.title}</h3>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-hud-white-dim tracking-wide">
            {LP.modes.dialogue.description}
          </p>
        </GlassCard>
        */}
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── Benefits Section ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
            FEATURES
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.15)]" />
        </div>

        <div className="flex flex-col gap-5">
          {LP.benefits.map((benefit) => {
            const colorMap = {
              cyan: {
                text: 'text-neon-cyan',
                border: 'rgba(0,212,255,0.3)',
                glow: 'rgba(0,212,255,0.15)',
                numGlow: '0 0 10px rgba(0,212,255,0.4)',
              },
              magenta: {
                text: 'text-neon-magenta',
                border: 'rgba(255,59,122,0.3)',
                glow: 'rgba(255,59,122,0.15)',
                numGlow: '0 0 10px rgba(255,59,122,0.4)',
              },
              lime: {
                text: 'text-neon-lime',
                border: 'rgba(168,255,0,0.3)',
                glow: 'rgba(168,255,0,0.15)',
                numGlow: '0 0 10px rgba(168,255,0,0.4)',
              },
            };
            const c = colorMap[benefit.color];

            return (
              <div key={benefit.number} className="relative">
                <div className="flex items-start gap-4">
                  <span
                    className={`text-lg font-black ${c.text} flex-shrink-0 w-8`}
                    style={{ textShadow: c.numGlow }}
                  >
                    {benefit.number}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold tracking-wider leading-snug">
                      {benefit.title}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-hud-white-dim mt-2 tracking-wide">
                      {benefit.description}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-4 h-px"
                  style={{
                    background: `linear-gradient(90deg, ${c.border}, transparent)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── "What This Is Not" — Contrasts ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-magenta opacity-60">
            WHAT KATARU IS
          </span>
          <div className="flex-1 h-px bg-[rgba(255,59,122,0.15)]" />
        </div>

        <div className="flex flex-col gap-3">
          {CONTRASTS.positionA.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[11px] tracking-wide"
            >
              <span className="text-neon-magenta opacity-60 line-through flex-shrink-0">
                {c.not}
              </span>
              <span className="text-[10px] text-hud-white-dim opacity-40 flex-shrink-0">
                {'//'}
              </span>
              <span className="text-neon-cyan">{c.but}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── ChatGPT Comparison ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
            VS CHATGPT
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.15)]" />
        </div>

        <p className="text-[11px] text-hud-white-dim tracking-wide mb-4">
          「ChatGPTに話せばよくない？」→ 違います。
        </p>

        <div className="flex flex-col gap-3">
          {CHATGPT_COMPARISON.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[11px] tracking-wide"
            >
              <span className="text-hud-white-dim opacity-50 line-through flex-shrink-0">
                {c.chatgpt}
              </span>
              <span className="text-[10px] text-hud-white-dim opacity-40 flex-shrink-0">
                {'→'}
              </span>
              <span className="text-neon-cyan">{c.kataru}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── Target Audience ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-lime opacity-60">
            FOR YOU
          </span>
          <div className="flex-1 h-px bg-[rgba(168,255,0,0.15)]" />
        </div>

        <GlassCard variant="lime" className="p-5" hudCorners>
          <p className="text-[9px] tracking-[2px] uppercase text-neon-lime opacity-70 mb-3">
            TARGET_USERS
          </p>
          <ul className="flex flex-col gap-2.5">
            {LP.targetAudience.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neon-lime mt-1.5 flex-shrink-0"
                  style={{ boxShadow: '0 0 4px #A8FF00' }}
                />
                <span className="text-xs tracking-wider text-hud-white leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── How It Works ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
            HOW IT WORKS
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.15)]" />
        </div>

        <div className="flex flex-col gap-4">
          {[
            { step: '01', label: '話す', desc: 'マイクボタンを押して、考えていることを声に出す。', color: 'cyan' },
            { step: '02', label: 'AIが整理', desc: 'Whisperで文字起こし。Geminiが要点・論点・アクションアイテムを整理。', color: 'magenta' },
            { step: '03', label: 'レポート', desc: '要点・論点・次の一手が見える構造化レポートが完成。', color: 'lime' },
          ].map((s) => {
            const colorVal =
              s.color === 'cyan' ? 'var(--neon-cyan)' :
              s.color === 'magenta' ? 'var(--neon-magenta)' : 'var(--neon-lime)';
            return (
              <div key={s.step} className="flex items-start gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span
                    className="text-lg font-black"
                    style={{ color: colorVal, textShadow: `0 0 10px ${colorVal}44` }}
                  >
                    {s.step}
                  </span>
                  {s.step !== '03' && (
                    <div
                      className="w-px h-8 mt-1"
                      style={{ background: `linear-gradient(180deg, ${colorVal}44, transparent)` }}
                    />
                  )}
                </div>
                <div className="pt-0.5">
                  <h4 className="text-sm font-bold tracking-wider" style={{ color: colorVal }}>
                    {s.label}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-hud-white-dim mt-1 tracking-wide">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="hud-line mx-5" />

      {/* ── Tech Stack (credibility) ── */}
      <section className="px-5 py-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] tracking-[3px] uppercase text-neon-cyan opacity-60">
            SYSTEM SPEC
          </span>
          <div className="flex-1 h-px bg-[rgba(0,212,255,0.15)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'VOICE_RECOGNITION', value: 'OpenAI Whisper' },
            { label: 'AI_ANALYSIS', value: 'Google Gemini' },
            { label: 'PLATFORM', value: 'Web + iOS' },
            { label: 'LANGUAGE', value: 'Japanese' },
          ].map((spec) => (
            <div
              key={spec.label}
              className="p-3 rounded-lg"
              style={{
                border: '1px solid rgba(0,212,255,0.1)',
                background: 'rgba(0,212,255,0.03)',
              }}
            >
              <div className="text-[8px] tracking-[2px] text-neon-cyan opacity-50 uppercase">
                {spec.label}
              </div>
              <div className="text-[11px] text-hud-white mt-1 tracking-wide">
                {spec.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 pt-6 pb-12">
        <div className="relative text-center">
          <HudCorners />
          <div className="py-10 px-4">
            <h2
              className="text-xl font-black tracking-[4px] text-neon-cyan"
              style={{
                textShadow: '0 0 30px rgba(0,212,255,0.4)',
                animation: 'logo-pulse 4s ease infinite',
              }}
            >
              {LP.closing.headline}
            </h2>
            <p className="text-[10px] tracking-[3px] uppercase text-hud-white-dim mt-2">
              {LP.closing.sub}
            </p>
            <div className="mt-6 flex justify-center">
              <NeonButton variant="cyan" onClick={handleCTA}>
                {LP.cta.primary}
              </NeonButton>
            </div>
            <button
              onClick={handleCTA}
              className="mt-3 text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border-0 cursor-pointer hover:text-neon-cyan transition-colors"
            >
              {LP.cta.secondary}
            </button>
          </div>
        </div>
      </section>

      {/* ── Server Wake / Waitlist Modal ── */}
      {modalState !== 'hidden' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="w-full max-w-[350px] rounded-xl p-6 relative"
            style={{
              background: 'rgba(10,14,26,0.95)',
              border: '1px solid rgba(0,212,255,0.2)',
              boxShadow: '0 0 40px rgba(0,212,255,0.1)',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-hud-white-dim opacity-50 hover:opacity-100 bg-transparent border-0 cursor-pointer text-lg"
            >
              ✕
            </button>

            {modalState === 'checking' && (
              <div className="text-center py-4">
                <div
                  className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent mx-auto mb-4"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <p className="text-sm text-hud-white tracking-wider">接続中...</p>
              </div>
            )}

            {modalState === 'waking' && (
              <div className="text-center">
                <div
                  className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent mx-auto mb-4"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <h3 className="text-sm font-bold text-neon-cyan tracking-wider mb-2">
                  サーバー起動中...
                </h3>
                <p className="text-[11px] text-hud-white-dim leading-relaxed tracking-wide mb-6">
                  無料サーバーのため、初回アクセス時に30〜50秒ほどお待ちいただく場合があります。起動が完了すると自動で画面が切り替わります。
                </p>

                <div className="hud-line mb-5" />

                <p className="text-[10px] tracking-[2px] uppercase text-neon-cyan opacity-60 mb-3">
                  または
                </p>

                <button
                  onClick={() => setModalState('waitlist-form')}
                  className="w-full py-3 rounded-lg text-xs font-bold tracking-wider cursor-pointer transition-all"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: 'var(--neon-cyan)',
                  }}
                >
                  ウェイティングリストに登録する
                </button>
                <p className="text-[10px] text-hud-white-dim opacity-50 mt-2 tracking-wide">
                  正式版リリース時にお知らせします
                </p>
              </div>
            )}

            {modalState === 'waitlist-form' && !waitlistDone && (
              <div>
                <h3 className="text-sm font-bold text-neon-cyan tracking-wider mb-2">
                  ウェイティングリスト登録
                </h3>
                <p className="text-[11px] text-hud-white-dim leading-relaxed tracking-wide mb-5">
                  正式版のリリース時にメールでお知らせします。
                </p>
                <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレス"
                    className="w-full px-4 py-3 rounded-lg text-xs tracking-wider outline-none"
                    style={{
                      background: 'rgba(0,212,255,0.05)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      color: 'var(--hud-white)',
                    }}
                  />
                  <NeonButton variant="cyan">
                    登録する
                  </NeonButton>
                </form>
                <button
                  onClick={() => setModalState('waking')}
                  className="mt-3 text-[10px] text-hud-white-dim opacity-50 bg-transparent border-0 cursor-pointer hover:opacity-100 transition-opacity w-full text-center"
                >
                  ← 戻る
                </button>
              </div>
            )}

            {modalState === 'waitlist-form' && waitlistDone && (
              <div className="text-center py-4">
                <div
                  className="text-3xl mb-3"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.5))' }}
                >
                  ✓
                </div>
                <h3 className="text-sm font-bold text-neon-cyan tracking-wider mb-2">
                  登録完了
                </h3>
                <p className="text-[11px] text-hud-white-dim leading-relaxed tracking-wide">
                  ありがとうございます。正式版リリース時にお知らせします。
                </p>
                <button
                  onClick={closeModal}
                  className="mt-5 text-[10px] tracking-[2px] text-neon-cyan bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
