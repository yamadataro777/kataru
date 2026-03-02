import { Session } from '@/types/session';
import { Conversation, ConversationReport } from '@/types/conversation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/audio`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Upload failed');
  }
  return res.json();
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
    const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/turns`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Failed to send turn');
    }
    return res.json();
  }
  return request(`/api/conversations/${conversationId}/turns`, {
    method: 'POST',
    body: JSON.stringify({ transcript }),
  });
}

export async function endConversation(id: string): Promise<{ conversation: Conversation; report: ConversationReport }> {
  return request(`/api/conversations/${id}/end`, { method: 'POST' });
}

export async function getAnalytics(): Promise<{
  totalSessions: number;
  totalWords: number;
  avgDuration: number;
  totalDuration: number;
  recentTopics: string[];
}> {
  const data = await request<Record<string, unknown>>('/api/analytics');
  return {
    totalSessions: (data.total_sessions as number) ?? 0,
    totalWords: (data.total_words as number) ?? 0,
    avgDuration: (data.avg_duration as number) ?? 0,
    totalDuration: (data.total_duration as number) ?? 0,
    recentTopics: (data.recent_topics as string[]) ?? [],
  };
}
