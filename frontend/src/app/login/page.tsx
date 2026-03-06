'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user, loading, devBypass } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Already logged in
  if (!loading && user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error: err } = await signUp(email, password);
        if (err) {
          setError(err);
        } else {
          setSignupSuccess(true);
        }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          router.push('/');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <span
          className="text-xs tracking-[3px] text-neon-cyan"
          style={{ animation: 'neon-flicker 2s ease infinite' }}
        >
          LOADING...
        </span>
      </div>
    );
  }

  if (signupSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5 gap-8">
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
            登録完了
          </h1>
          <p className="text-xs text-hud-white-dim tracking-wide mt-3 leading-6">
            確認メールを送信しました。
            <br />
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
        </div>
        <NeonButton onClick={() => { setSignupSuccess(false); setMode('login'); }}>
          ログインへ
        </NeonButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-[6px] text-neon-cyan"
            style={{ textShadow: '0 0 20px rgba(0,212,255,0.4)' }}
          >
            KATARU
          </h1>
          <p className="text-[10px] tracking-[3px] text-hud-white-dim mt-2 uppercase">
            Voice-powered thinking
          </p>
        </div>

        <GlassCard className="p-6" variant="cyan">
          {/* Mode Toggle */}
          <div className="flex mb-6">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 text-[10px] font-bold tracking-[2px] py-2 cursor-pointer transition-all"
                style={{
                  color: mode === m ? 'var(--neon-cyan)' : 'rgba(232,237,245,0.4)',
                  borderBottom: mode === m ? '2px solid var(--neon-cyan)' : '2px solid transparent',
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                }}
              >
                {m === 'login' ? 'LOGIN' : 'SIGN UP'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[9px] tracking-[2px] text-hud-white-dim block mb-1.5">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.2)] rounded-lg px-3 py-2.5 text-base text-hud-white tracking-wide focus:outline-none focus:border-[rgba(0,212,255,0.5)]"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="text-[9px] tracking-[2px] text-hud-white-dim block mb-1.5">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.2)] rounded-lg px-3 py-2.5 text-base text-hud-white tracking-wide focus:outline-none focus:border-[rgba(0,212,255,0.5)]"
                placeholder={mode === 'signup' ? '6文字以上' : '••••••'}
              />
            </div>

            {error && (
              <p className="text-[10px] text-neon-magenta tracking-[1px] text-center">
                {error}
              </p>
            )}

            <NeonButton onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} disabled={submitting} className="w-full mt-2">
              {submitting ? 'PROCESSING...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </NeonButton>
          </form>
        </GlassCard>

        {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' && (
          <button
            onClick={() => { devBypass(); router.push('/'); }}
            className="mt-4 w-full text-[10px] tracking-[2px] text-hud-white-dim bg-transparent border border-[rgba(255,59,122,0.3)] rounded py-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
          >
            DEV: SKIP AUTH
          </button>
        )}
      </div>
    </div>
  );
}
