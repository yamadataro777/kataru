import { Session } from '@/types/session';
import { Conversation, ConversationReport } from '@/types/conversation';
import { supabase } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Dev bypass: skip Supabase auth entirely
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    return { 'X-Dev-Bypass': 'true' };
  }
  if (!supabase) {
    console.warn('[Auth] supabase client is null');
    return {};
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) console.warn('[Auth] getSession error:', error.message);
  if (!session?.access_token) {
    console.warn('[Auth] no access_token, session:', !!session);
    return {};
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const timeoutMs = 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || error.error || `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('サーバーに接続できませんでした。時間を置いて再試行してください。');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function createSession(): Promise<Session> {
  return request<Session>('/api/sessions', { method: 'POST' });
}

export async function getSessions(): Promise<Session[]> {
  return request<Session[]>('/api/sessions');
}

export async function getSession(id: string): Promise<Session> {
  return request<Session>(`/api/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/sessions/${id}`, { method: 'DELETE' });
}

export async function updateSession(id: string, updates: { user_conclusion?: string | null }): Promise<Session> {
  return request<Session>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function uploadAudio(sessionId: string, audioBlob: Blob): Promise<Session> {
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
  const formData = new FormData();
  formData.append('audio', audioBlob, `recording.${ext}`);
  const signal = createTimeoutSignal(60_000);
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/audio`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Upload failed');
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('アップロードがタイムアウトしました。再試行してください。');
    }
    throw err;
  }
}

export async function transcribe(sessionId: string, transcript?: string): Promise<unknown> {
  return request('/api/transcribe', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, transcript }),
  });
}

export async function generateReport(sessionId: string): Promise<unknown> {
  return request('/api/report', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// === Feedback API ===

export async function submitFeedback(data: {
  score: number;
  comment?: string;
  suggestion?: string;
  device_id?: string;
}): Promise<unknown> {
  return request('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === Conversation API ===

export async function createConversation(): Promise<{ conversation: Conversation; turn: { ai_response: string } }> {
  return request('/api/conversations', { method: 'POST' });
}

export async function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>('/api/conversations');
}

export async function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  await request(`/api/conversations/${id}`, { method: 'DELETE' });
}

export async function sendTurn(
  conversationId: string,
  audioBlob?: Blob,
  transcript?: string
): Promise<{ turn: { ai_response: string; turn_number: number; phase: string; question_type: string; user_transcript: string | null }; conversation: Conversation }> {
  if (audioBlob) {
    const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);
    if (transcript) formData.append('transcript', transcript);
    const signal = createTimeoutSignal(90_000);
    const authHeaders = await getAuthHeaders();
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/turns`, {
        method: 'POST',
        body: formData,
        headers: authHeaders,
        signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message || body.error || 'Failed to send turn');
      }
      return res.json();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('送信がタイムアウトしました。再試行してください。');
      }
      throw err;
    }
  }
  return request(`/api/conversations/${conversationId}/turns`, {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
}

export async function endConversation(id: string): Promise<{ conversation: Conversation; report: ConversationReport }> {
  return request(`/api/conversations/${id}/end`, { method: 'POST' });
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface RecentSessionSummary {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  topics: string[];
}

export interface PendingAction {
  action: string;
  sessionId: string;
  sessionDate: string;
  sessionTitle: string;
}

export interface AnalyticsData {
  totalSessions: number;
  totalWords: number;
  avgDuration: number;
  totalDuration: number;
  recentTopics: string[];
  topicCounts: TopicCount[];
  recentSessions: RecentSessionSummary[];
  pendingActions: PendingAction[];
  monthlySessionCount: number;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const data = await request<Record<string, unknown>>('/api/analytics');

  const rawRecentSessions = (data.recent_sessions as Array<Record<string, unknown>>) ?? [];
  const rawPendingActions = (data.pending_actions as Array<Record<string, unknown>>) ?? [];

  return {
    totalSessions: (data.total_sessions as number) ?? 0,
    totalWords: (data.total_words as number) ?? 0,
    avgDuration: (data.avg_duration as number) ?? 0,
    totalDuration: (data.total_duration as number) ?? 0,
    recentTopics: (data.recent_topics as string[]) ?? [],
    topicCounts: (data.topic_counts as TopicCount[]) ?? [],
    recentSessions: rawRecentSessions.map((s) => ({
      id: s.id as string,
      createdAt: s.created_at as string,
      title: s.title as string,
      summary: s.summary as string,
      topics: (s.topics as string[]) ?? [],
    })),
    pendingActions: rawPendingActions.map((a) => ({
      action: a.action as string,
      sessionId: a.session_id as string,
      sessionDate: a.session_date as string,
      sessionTitle: a.session_title as string,
    })),
    monthlySessionCount: (data.monthly_session_count as number) ?? 0,
  };
}

// === Coaching API ===

// === Account API ===

export async function togglePlan(): Promise<unknown> {
  return request('/api/auth/upgrade', { method: 'POST' });
}

export async function deleteAccount(): Promise<void> {
  await request('/api/auth/account', { method: 'DELETE' });
}

export async function transcribeCoachingAudio(audio: Blob): Promise<{ transcript: string }> {
  const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('wav') ? 'wav' : 'webm';
  const formData = new FormData();
  formData.append('audio', audio, `recording.${ext}`);
  const signal = createTimeoutSignal(30_000);
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${BASE_URL}/api/coaching/transcribe`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message || body.error || '文字起こしに失敗しました');
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('文字起こしがタイムアウトしました。再試行してください。');
    }
    throw err;
  }
}

export async function createCoachingSession() {
  return request('/api/coaching', { method: 'POST' });
}

export async function getCoachingInitialMessage(id: string, stage: number, mode: string) {
  return request(`/api/coaching/${id}/initial`, {
    method: 'POST',
    body: JSON.stringify({ stage, mode }),
  });
}

export async function submitCoachingTurn(
  id: string,
  data: { transcript?: string; stage: number; mode?: string; audio?: Blob }
) {
  if (data.audio) {
    const ext = data.audio.type.includes('mp4') ? 'mp4' : data.audio.type.includes('wav') ? 'wav' : 'webm';
    const formData = new FormData();
    formData.append('audio', data.audio, `recording.${ext}`);
    if (data.transcript) formData.append('transcript', data.transcript);
    formData.append('stage', String(data.stage));
    if (data.mode) formData.append('mode', data.mode);
    const signal = createTimeoutSignal(90_000);
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/api/coaching/${id}/turns`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message || body.error || 'Failed to submit turn');
    }
    return res.json();
  }
  return request(`/api/coaching/${id}/turns`, {
    method: 'POST',
    body: JSON.stringify({
      transcript: data.transcript,
      stage: data.stage,
      mode: data.mode,
    }),
  });
}

export async function advanceCoachingStage(id: string, nextStage: number, extractedData?: unknown) {
  return request(`/api/coaching/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ nextStage, extractedData }),
  });
}

export async function endCoachingSession(id: string) {
  return request(`/api/coaching/${id}/end`, { method: 'POST' });
}

// === Brain Dump API ===

export async function fetchBrainDumpQuestion(
  transcript: string,
  previousQuestions: string[],
  elapsedSeconds: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/api/brain-dump/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        transcript,
        previous_questions: previousQuestions,
        elapsed_seconds: elapsedSeconds,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data.question ?? null;
  } catch {
    return null;
  }
}

export async function fetchIntegrationQuestion(transcript: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/api/brain-dump/integration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data.question ?? null;
  } catch {
    return null;
  }
}

export async function submitCoachingFeedback(data: {
  score: number;
  comment?: string;
  suggestion?: string;
  device_id?: string;
}): Promise<unknown> {
  return submitFeedback(data);
}

// === Trust Memory API (Phase 8) ===

export interface TrustMemoryTheme {
  label: string;
  count: number;
  last_seen: string;
  decay_weight: number;
}

export interface TrustMemoryData {
  recurring_themes?: TrustMemoryTheme[];
  tone_signals?: {
    prefers_structure?: boolean;
    avoids_depth_push?: boolean;
    last_updated: string;
  };
  session_history?: Array<{
    date: string;
    primary_mode: string;
    max_depth: number;
    structure_helped: boolean;
    depth_felt_pushy: boolean;
  }>;
  version: number;
  last_updated?: string;
}

export async function getTrustMemory(): Promise<{ trust_memory: TrustMemoryData | null }> {
  return request('/api/auth/trust-memory');
}

export async function deleteTrustMemory(): Promise<void> {
  await request('/api/auth/trust-memory', { method: 'DELETE' });
}

export async function submitGate8Evaluation(data: {
  session_id: string;
  continued_feeling: boolean | null;
  creepy_feeling: boolean | null;
  experiment_stage: string;
  inject_variant: string | null;
  has_prior_memory: boolean;
  session_pair_number: number;
  snapshot_version_at_start: number;
  topic_bucket: string;
}): Promise<void> {
  await request('/api/round/gate8-evaluation', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === Round Protocol API ===

export interface RoundSessionMemory {
  working_hypothesis: string | null;
  open_loops: string[];
  core_tension: string | null;
  recent_question_angle: string;
}

export interface RoundQuestionResponse {
  round_id: string;
  transcript: string;
  mirror: string;
  question: string;
  // Thinking Companion fields (present when TC is enabled)
  echo?: string;
  sense?: string;
  next?: string;
  maybe?: string | null;  // Phase 7
  is_crisis?: boolean;
  memory: RoundSessionMemory;
  latency_ms: number;
  used_fallback: boolean;
  // Phase 8: experiment metadata
  experiment_stage?: 'shadow' | 'gate8_ab' | 'live';
  inject_variant?: 'inject' | 'control' | null;
  has_prior_memory?: boolean;
  snapshot_version_at_start?: number;
  // Phase 10: adapter token (R1 auto-detect 採用時)
  adapter_token?: string;
}

export interface RoundSummaryResponseV1 {
  blockage: string;
  key_points: string[];
  next_step: string;
  latency_ms: number;
}

export interface RoundSummaryResponseV2 {
  version: 2;
  journey: {
    start_quote: string;
    shift: string;
    end_quote: string;
  };
  awareness: string;
  next_step: {
    type: 'action' | 'question' | 'invitation';
    content: string;
  };
  latency_ms: number;
  // Phase 8
  topic_bucket?: 'work' | 'emotion' | 'introspection' | 'casual';
}

export type RoundSummaryResponse = RoundSummaryResponseV1 | RoundSummaryResponseV2;

export async function createRoundSession(
  selectedDuration: number,
  adapterId?: string,
): Promise<{ id: string; created_at: string; adapter_token?: string }> {
  return request('/api/round/session', {
    method: 'POST',
    body: JSON.stringify({
      selected_duration: selectedDuration,
      ...(adapterId ? { adapter_id: adapterId } : {}),
    }),
  });
}

export async function submitRoundQuestion(formData: FormData): Promise<RoundQuestionResponse> {
  const signal = createTimeoutSignal(30_000);
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${BASE_URL}/api/round/question`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || error.error || '分析に失敗しました');
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('分析がタイムアウトしました。再試行してください。');
    }
    throw err;
  }
}

export async function submitRoundSummary(sessionId: string): Promise<RoundSummaryResponse> {
  return request('/api/round/summary', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function updateRoundSession(
  id: string,
  data: { session_rating?: number; status?: string },
): Promise<unknown> {
  return request(`/api/round/session/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateRoundRound(
  id: string,
  questionRating: string,
): Promise<unknown> {
  return request(`/api/round/round/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ question_rating: questionRating }),
  });
}

export async function rerollRoundQuestion(roundId: string): Promise<RoundQuestionResponse> {
  return request(`/api/round/round/${roundId}/reroll`, { method: 'POST' });
}

export async function deleteRoundRound(roundId: string): Promise<{ memory: RoundSessionMemory | null }> {
  return request(`/api/round/round/${roundId}`, { method: 'DELETE' });
}

// === Phase 9: Extension API ===

export async function extendRoundSession(sessionId: string): Promise<{ max_rounds_allowed: number }> {
  return request('/api/round/extend', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function submitExtensionEvent(sessionId: string, eventType: string): Promise<void> {
  await request('/api/round/extension-event', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, event_type: eventType }),
  });
}

// === Marketing API ===

export interface MarketingFieldState<T = string | string[] | null> {
  status: 'known' | 'assumed' | 'missing' | 'conflicted';
  value: T;
}

export interface MarketingCanvasState {
  goal: MarketingFieldState<string | null>;
  product: MarketingFieldState<string | null>;
  target_customer: MarketingFieldState<string | null>;
  pain: MarketingFieldState<string[]>;
  trigger_moment: MarketingFieldState<string[]>;
  promise: MarketingFieldState<string | null>;
  differentiation: MarketingFieldState<string[]>;
  proof: MarketingFieldState<string[]>;
  channel: MarketingFieldState<string[]>;
  offer: MarketingFieldState<string[]>;
  next_experiment: MarketingFieldState<string | null>;
  current_focus?: string | null;
}

export interface MarketingQuestionResponse {
  round_id: string;
  transcript: string;
  mirror: string;
  question: string;
  question_type: string;
  question_target_field: string;
  canvas: MarketingCanvasState;
  round_number: number;
  latency_ms: number;
  used_fallback: boolean;
}

export interface MarketingSummaryResponse {
  marketing_hypothesis: string;
  target_hypothesis: string;
  pain_hypothesis: string;
  promised_value: string;
  appeal_angles: string[];
  next_experiment: string;
}

export async function createMarketingSession(
  goal: string,
): Promise<{ id: string; canvas: MarketingCanvasState }> {
  return request('/api/marketing/session', {
    method: 'POST',
    body: JSON.stringify({ goal }),
  });
}

export async function submitMarketingQuestion(formData: FormData): Promise<MarketingQuestionResponse> {
  const signal = createTimeoutSignal(60_000);
  const authHeaders = await getAuthHeaders();
  try {
    const res = await fetch(`${BASE_URL}/api/marketing/question`, {
      method: 'POST',
      body: formData,
      headers: authHeaders,
      signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || error.error || '分析に失敗しました');
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('分析がタイムアウトしました。再試行してください。');
    }
    throw err;
  }
}

export async function submitMarketingSummary(
  sessionId: string,
): Promise<MarketingSummaryResponse> {
  return request('/api/marketing/summary', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function updateMarketingSession(
  id: string,
  data: { status?: string },
): Promise<unknown> {
  return request(`/api/marketing/session/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateMarketingRound(
  id: string,
  questionRating: string,
): Promise<unknown> {
  return request(`/api/marketing/round/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ question_rating: questionRating }),
  });
}
