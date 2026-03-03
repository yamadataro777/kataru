import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

vi.mock('../../services/supabase', () => ({
  getSession: vi.fn(),
  updateSession: vi.fn(),
  supabase: {},
}));

vi.mock('../../services/gemini', () => ({
  generateReport: vi.fn(),
  generateContent: vi.fn(),
}));

import { getSession, updateSession } from '../../services/supabase';
import { generateReport } from '../../services/gemini';

const mockSession = {
  id: 'sess-1',
  status: 'transcribed',
  transcript: '今日は仕事について話しました。',
  report: null,
};

const mockReport = {
  title: 'テストレポート',
  summary: '仕事に関する思考の整理',
  key_insights: ['重要な洞察1'],
  topics: ['仕事', 'キャリア'],
  sentiment: { overall: 'neutral', score: 0.5, details: '中立的な感情' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/report', () => {
  it('returns 400 when session_id is missing', async () => {
    const res = await request(app).post('/api/report').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/session_id/i);
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await request(app).post('/api/report').send({ session_id: 'nonexistent' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when session has no transcript', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...mockSession, transcript: null });

    const res = await request(app).post('/api/report').send({ session_id: 'sess-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no transcript/i);
  });

  it('generates free plan report', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' });

    const res = await request(app).post('/api/report').send({ session_id: 'sess-1' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('テストレポート');
    expect(generateReport).toHaveBeenCalledWith(mockSession.transcript, 'free');
  });

  it('generates paid plan report when plan=paid', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' });

    const res = await request(app)
      .post('/api/report')
      .send({ session_id: 'sess-1', plan: 'paid' });

    expect(res.status).toBe(200);
    expect(generateReport).toHaveBeenCalledWith(mockSession.transcript, 'paid');
  });

  it('returns 500 when generateReport throws', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockRejectedValue(new Error('Gemini error'));
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, status: 'generating' });

    const res = await request(app).post('/api/report').send({ session_id: 'sess-1' });

    expect(res.status).toBe(500);
  });
});
