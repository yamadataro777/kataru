import { Session } from '@/types/session';
import { Conversation, ConversationReport } from '@/types/conversation';
import { supabase } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
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
  memory: RoundSessionMemory;
  latency_ms: number;
  used_fallback: boolean;
}

export interface RoundSummaryResponse {
  blockage: string;
  key_points: string[];
  next_step: string;
  latency_ms: number;
}

export async function createRoundSession(
  selectedDuration: number,
): Promise<{ id: string; created_at: string }> {
  return request('/api/round/session', {
    method: 'POST',
    body: JSON.stringify({ selected_duration: selectedDuration }),
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

export async function submitRoundSummary(data: {
  session_id: string;
  round3_transcript: string;
  mirrors: string[];
  questions: string[];
  session_memory: RoundSessionMemory | null;
}): Promise<RoundSummaryResponse> {
  return request('/api/round/summary', {
    method: 'POST',
    body: JSON.stringify(data),
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

export async function fetchBrainDumpQuestion(
  transcript: string,
  duration: number,
  questionsShown: string[],
  phase: 'expansion' | 'connection' | 'confrontation',
): Promise<{ question: string | null }> {
  return request('/api/brain-dump/question', {
    method: 'POST',
    body: JSON.stringify({ transcript, duration, questionsShown, phase }),
  });
}


