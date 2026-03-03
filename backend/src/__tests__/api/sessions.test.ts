import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

vi.mock('../../services/supabase', () => ({
  createSession: vi.fn(),
  getSessions: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  supabase: {},
}));

vi.mock('../../services/storage', () => ({
  uploadAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
} from '../../services/supabase';
import { uploadAudio, deleteAudio } from '../../services/storage';

const mockSession = {
  id: 'sess-1',
  status: 'recording',
  created_at: '2026-01-01T00:00:00Z',
  audio_url: null,
  audio_file_path: null,
  transcript: null,
  word_count: null,
  report: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/sessions', () => {
  it('creates a session and returns 201', async () => {
    vi.mocked(createSession).mockResolvedValue(mockSession);

    const res = await request(app).post('/api/sessions');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'sess-1', status: 'recording' });
    expect(createSession).toHaveBeenCalledOnce();
  });

  it('returns 500 when createSession throws', async () => {
    vi.mocked(createSession).mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/api/sessions');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/sessions', () => {
  it('returns session list', async () => {
    vi.mocked(getSessions).mockResolvedValue([mockSession]);

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('sess-1');
  });

  it('returns 500 when getSessions throws', async () => {
    vi.mocked(getSessions).mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns the session when found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const res = await request(app).get('/api/sessions/sess-1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sess-1');
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await request(app).get('/api/sessions/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes session and returns 204', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(deleteAudio).mockResolvedValue(undefined);
    vi.mocked(deleteSession).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/sessions/sess-1');

    expect(res.status).toBe(204);
    expect(deleteSession).toHaveBeenCalledWith('sess-1');
  });

  it('deletes audio file when audio_file_path exists', async () => {
    const sessionWithAudio = { ...mockSession, audio_file_path: 'sess-1/audio.webm' };
    vi.mocked(getSession).mockResolvedValue(sessionWithAudio);
    vi.mocked(deleteAudio).mockResolvedValue(undefined);
    vi.mocked(deleteSession).mockResolvedValue(undefined);

    await request(app).delete('/api/sessions/sess-1');

    expect(deleteAudio).toHaveBeenCalledWith('sess-1/audio.webm');
  });

  it('skips deleteAudio when no audio_file_path', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(deleteSession).mockResolvedValue(undefined);

    await request(app).delete('/api/sessions/sess-1');

    expect(deleteAudio).not.toHaveBeenCalled();
  });
});

describe('POST /api/sessions/:id/audio', () => {
  it('uploads audio and returns updated session', async () => {
    const updatedSession = { ...mockSession, audio_url: 'https://example.com/audio.webm', status: 'uploaded' };
    vi.mocked(updateSession).mockResolvedValueOnce({ ...mockSession, status: 'uploading' });
    vi.mocked(uploadAudio).mockResolvedValue({
      publicUrl: 'https://example.com/audio.webm',
      filePath: 'sess-1/audio.webm',
    });
    vi.mocked(updateSession).mockResolvedValueOnce(updatedSession);

    const res = await request(app)
      .post('/api/sessions/sess-1/audio')
      .attach('audio', Buffer.from('fake audio data'), {
        filename: 'recording.webm',
        contentType: 'audio/webm',
      });

    expect(res.status).toBe(200);
    expect(res.body.audio_url).toBe('https://example.com/audio.webm');
  });

  it('returns 400 when no audio file provided', async () => {
    const res = await request(app).post('/api/sessions/sess-1/audio');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no audio/i);
  });
});
