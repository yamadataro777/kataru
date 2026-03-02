import { Session } from '@/types/session';
import { Conversation, ConversationReport } from '@/types/conversation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `Request failed: ${res.status}`);
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

export async function uploadAudio(sessionId: string, audioBlob: Blob): Promise<Session> {
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('wav') ? 'wav' : 'webm';
  const formData = new FormData();
  formData.append('audio', audioBlob, `recording.${ext}`);
  const signal = createTimeoutSignal(60_000);
  try {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/audio`, {
      method: 'POST',
      body: formData,
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

export async function generateReport(sessionId: string, plan?: 'free' | 'paid'): Promise<unknown> {
  return request('/api/report', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, plan: plan || 'free' }),
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
    const signal = createTimeoutSignal(60_000);
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/turns`, {
        method: 'POST',
        body: formData,
        signal,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Failed to send turn');
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
  // Existing fields (used by Home page)
  totalSessions: number;
  totalWords: number;
  avgDuration: number;
  totalDuration: number;
  recentTopics: string[];
  // New fields for THINKING MAP
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
