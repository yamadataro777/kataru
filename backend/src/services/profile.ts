import { supabase } from './supabase';

export type UserPlan = 'free' | 'lite' | 'standard';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  session_count: number;
  free_sessions_used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementSessionCount(userId: string) {
  const profile = await getProfile(userId);
  return updateProfile(userId, {
    session_count: profile.session_count + 1,
    free_sessions_used: profile.plan === 'free'
      ? profile.free_sessions_used + 1
      : profile.free_sessions_used,
  });
}

export async function getUserSessionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function canCreateSession(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const profile = await getProfile(userId);

  const limits: Record<UserPlan, number> = {
    free: 5,
    lite: 15,
    standard: Infinity,
  };

  const limit = limits[profile.plan];

  if (profile.plan === 'free') {
    if (profile.free_sessions_used >= limit) {
      return { allowed: false, reason: 'Free プランのセッション上限（月5回）に達しました' };
    }
  }

  // For lite, check monthly usage
  if (profile.plan === 'lite') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString());

    if (error) throw error;
    if ((count || 0) >= limit) {
      return { allowed: false, reason: 'Lite プランの月間セッション上限（15回）に達しました' };
    }
  }

  return { allowed: true };
}

export function getReportPlan(userPlan: UserPlan, freeSessionsUsed?: number): 'free' | 'paid' {
  if (userPlan !== 'free') return 'paid';
  // Gradual unlock: session 3 (index 2) gets a one-time paid report preview
  if (freeSessionsUsed === 2) return 'paid';
  return 'free';
}
