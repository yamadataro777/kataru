import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

vi.mock('../../services/supabase', () => ({
  getSession: vi.fn(),
  updateSession: vi.fn(),
  supabase: {},
}));

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    })),
    toFile: vi.fn().mockImplementation(async (buffer: Buffer, name: string, opts: Record<string, unknown>) => ({
      name,
      ...opts,
    })),
  };
});

import { getSession, updateSession } from '../../services/supabase';
import OpenAI from 'openai';

const mockSession = {
  id: 'sess-1',
  audio_url: 'https://storage.example.com/sess-1/audio.webm',
  transcript: null,
  status: 'uploaded',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Mock global fetch for audio download
  global.fetch = vi.fn().mockResolvedValue({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as Response);
});

describe('POST /api/transcribe', () => {
  it('returns 400 when session_id is missing', async () => {
    const res = await request(app).post('/api/transcribe').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/session_id/i);
  });

  it('uses clientTranscript directly when provided', async () => {
    const updatedSession = { ...mockSession, transcript: 'テストの文字起こし', word_count: 9 };
    vi.mocked(updateSession).mockResolvedValue(updatedSession);

    const res = await request(app)
      .post('/api/transcribe')
      .send({ session_id: 'sess-1', transcript: 'テストの文字起こし' });

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe('テストの文字起こし');
    // Should not have called getSession for Whisper path
    expect(getSession).not.toHaveBeenCalled();
  });

  it('calls Whisper when no client transcript', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    const openaiInstance = new (OpenAI as unknown as new () => {
      audio: { transcriptions: { create: ReturnType<typeof vi.fn> } }
    })();
    openaiInstance.audio.transcriptions.create.mockResolvedValue({ text: '音声の文字起こし' });
    vi.mocked(updateSession).mockResolvedValue({
      ...mockSession,
      transcript: '音声の文字起こし',
      word_count: 8,
    });

    const res = await request(app)
      .post('/api/transcribe')
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(200);
    expect(getSession).toHaveBeenCalledWith('sess-1');
  });

  it('returns 400 when session has no audio_url (Whisper path)', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...mockSession, audio_url: null });

    const res = await request(app)
      .post('/api/transcribe')
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no audio/i);
  });

  it('removes hallucination patterns from transcript', async () => {
    const dirtyTranscript = 'ご視聴ありがとうございました。重要な内容です。';
    const updatedSession = { ...mockSession, transcript: '重要な内容です。', word_count: 8 };
    vi.mocked(updateSession).mockResolvedValue(updatedSession);

    const res = await request(app)
      .post('/api/transcribe')
      .send({ session_id: 'sess-1', transcript: dirtyTranscript });

    expect(res.status).toBe(200);
    expect(res.body.transcript).not.toContain('ご視聴ありがとうございました');
  });
});
