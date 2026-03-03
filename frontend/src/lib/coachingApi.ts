const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const coachingApi = {
  // Create a new coaching session
  createSession: () =>
    apiRequest<{ id: string; current_stage: number; stage_mode: string | null; [key: string]: any }>(
      '/api/coaching',
      { method: 'POST' }
    ),

  // Get initial message for a stage/mode
  getInitialMessage: (id: string, stage: number, mode: string | null) =>
    apiRequest<any>(`/api/coaching/${id}/initial`, {
      method: 'POST',
      body: JSON.stringify({ stage, mode }),
    }),

  // Submit a turn (audio + transcript)
  submitTurn: (
    id: string,
    data: {
      audioBlob?: Blob;
      transcript?: string;
      stage: number;
      mode: string | null;
    }
  ): Promise<{ turn: any; response: any }> => {
    if (data.audioBlob) {
      const formData = new FormData();
      const ext = data.audioBlob.type.includes('mp4')
        ? 'mp4'
        : data.audioBlob.type.includes('wav')
          ? 'wav'
          : 'webm';
      formData.append('audio', data.audioBlob, `audio.${ext}`);
      if (data.transcript) formData.append('transcript', data.transcript);
      formData.append('stage', String(data.stage));
      if (data.mode) formData.append('mode', data.mode);
      return fetch(`${API_URL}/api/coaching/${id}/turns`, {
        method: 'POST',
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    } else {
      return apiRequest(`/api/coaching/${id}/turns`, {
        method: 'POST',
        body: JSON.stringify({ transcript: data.transcript, stage: data.stage, mode: data.mode }),
      });
    }
  },

  // Advance to next stage
  advanceStage: (id: string, nextStage: number, extractedData: any) =>
    apiRequest<any>(`/api/coaching/${id}/advance`, {
      method: 'POST',
      body: JSON.stringify({ nextStage, extractedData }),
    }),

  // End session and get report
  endSession: (id: string) =>
    apiRequest<{ report: any }>(`/api/coaching/${id}/end`, { method: 'POST' }),

  // Get session
  getSession: (id: string) => apiRequest<any>(`/api/coaching/${id}`),
};
