'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { initRevenueCat, isNativePlatform } from '@/lib/revenuecat';
import type { User, Session } from '@supabase/supabase-js';

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type UserPlan = 'free' | 'lite' | 'standard';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  session_count: number;
  free_sessions_used: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        return await res.json() as UserProfile;
      }
    } catch {
      // Profile fetch failed, will use defaults
    }
    return null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let profile: UserProfile | null = null;
      if (session) {
        profile = await fetchProfile(session.access_token);
        if (isNativePlatform()) {
          initRevenueCat(session.user.id).catch(console.error);
        }
      }
      setState({
        user: session?.user ?? null,
        session,
        profile,
        loading: false,
      });
    });

    // Handle deep link callback from OAuth (iOS in-app browser)
    if (isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('login-callback')) {
            // Extract tokens from the URL fragment
            const hashParams = new URLSearchParams(url.split('#')[1] || '');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken && supabase) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
            // Close the in-app browser
            import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => {});
          }
        });
      }).catch(() => {});
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let profile: UserProfile | null = null;
        if (session) {
          profile = await fetchProfile(session.access_token);
          if (isNativePlatform()) {
            initRevenueCat(session.user.id).catch(console.error);
          }
        }
        setState({
          user: session?.user ?? null,
          session,
          profile,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    if (isNativePlatform()) {
      // In-app browser on iOS using SFSafariViewController
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.kataru.voicememocom123://login-callback',
            skipBrowserRedirect: true,
          },
        });
        if (error || !data.url) return { error: error?.message ?? 'Failed to get OAuth URL' };
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: data.url, presentationStyle: 'popover' });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Google Sign-In failed' };
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
      return { error: error?.message ?? null };
    }
  };

  const signInWithApple = async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    if (isNativePlatform()) {
      // Native Apple Sign-In on iOS
      try {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.kataru.voicememocom123',
          redirectURI: 'https://nkalumkntqpeoouvehwq.supabase.co/auth/v1/callback',
          scopes: 'email name',
        });
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.response.identityToken,
        });
        return { error: error?.message ?? null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Apple Sign-In failed';
        if (msg.includes('cancelled') || msg.includes('canceled')) return { error: null };
        return { error: msg };
      }
    } else {
      // Web fallback: OAuth redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
      return { error: error?.message ?? null };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ user: null, session: null, profile: null, loading: false });
  };

  const refreshProfile = async () => {
    if (!state.session) return;
    const profile = await fetchProfile(state.session.access_token);
    if (profile) {
      setState(prev => ({ ...prev, profile }));
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  // Keep Render backend warm by pinging every 14 minutes
  const keepAliveRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    const ping = () => { fetch(`${API_URL}/health`).catch(() => {}); };
    ping(); // initial ping on app load
    keepAliveRef.current = setInterval(ping, KEEP_ALIVE_INTERVAL);
    return () => clearInterval(keepAliveRef.current);
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      refreshProfile,
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
