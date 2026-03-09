'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import NeonButton from '@/components/ui/NeonButton';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, signInWithApple, user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
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
      <div className="fixed inset-0 flex items-center justify-center">
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
      <div className="fixed inset-0 flex flex-col items-center justify-center px-5 gap-8">
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
    <div className="fixed inset-0 flex flex-col items-center justify-center px-5 overflow-y-auto">
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
            {(['signup', 'login'] as Mode[]).map((m) => (
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

        {/* OAuth Sign-In */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-[rgba(232,237,245,0.15)]" />
            <span className="text-[9px] tracking-[2px] text-hud-white-dim">OR</span>
            <div className="flex-1 h-[1px] bg-[rgba(232,237,245,0.15)]" />
          </div>

          <button
            onClick={async () => {
              setError(null);
              const { error: err } = await signInWithApple();
              if (err) setError(err);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[rgba(232,237,245,0.2)] bg-[rgba(232,237,245,0.05)] cursor-pointer transition-all hover:bg-[rgba(232,237,245,0.1)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="text-xs tracking-[1px] text-hud-white">{mode === 'signup' ? 'Sign up' : 'Sign in'} with Apple</span>
          </button>

          <button
            onClick={async () => {
              setError(null);
              const { error: err } = await signInWithGoogle();
              if (err) setError(err);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[rgba(232,237,245,0.2)] bg-[rgba(232,237,245,0.05)] cursor-pointer transition-all hover:bg-[rgba(232,237,245,0.1)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-xs tracking-[1px] text-hud-white">{mode === 'signup' ? 'Sign up' : 'Sign in'} with Google</span>
          </button>
        </div>

      </div>
    </div>
  );
}
