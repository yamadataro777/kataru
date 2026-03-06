'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { initRevenueCat, isNativePlatform } from '@/lib/revenuecat';
import type { User, Session } from '@supabase/supabase-js';

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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  devBypass: () => void;
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

  const devBypass = () => {
    if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS !== 'true') return;
    setState({
      user: { id: 'dev-user', email: 'dev@localhost' } as User,
      session: null,
      profile: { id: 'dev-user', plan: 'standard', session_count: 0, free_sessions_used: 0, created_at: new Date().toISOString() },
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      getAccessToken,
      devBypass,
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
