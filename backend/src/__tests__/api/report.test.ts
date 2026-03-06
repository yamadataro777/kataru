import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

vi.mock('../../services/supabase', () => ({
  getSession: vi.fn(),
  updateSession: vi.fn(),
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { plan: 'free' }, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('../../services/gemini', () => ({
  generateReport: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock('../../services/profile', () => ({
  getReportPlan: vi.fn(),
  incrementSessionCount: vi.fn(),
  getProfile: vi.fn(),
}));

import { getSession, updateSession, supabase } from '../../services/supabase';
import { generateReport } from '../../services/gemini';
import { getReportPlan, incrementSessionCount, getProfile } from '../../services/profile';

const mockSession = {
  id: 'sess-1',
  user_id: 'user-1',
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

const MOCK_TOKEN = 'mock-token';
const MOCK_USER_ID = 'user-1';

function mockAuth() {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  } as any);
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { plan: 'free' }, error: null }),
      }),
    }),
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth();
  vi.mocked(getProfile).mockResolvedValue({ free_sessions_used: 0, plan: 'free' } as any);
  vi.mocked(getReportPlan).mockReturnValue('free');
  vi.mocked(incrementSessionCount).mockResolvedValue(undefined as any);
});

describe('POST /api/report', () => {
  it('returns 400 when session_id is missing', async () => {
    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/session_id/i);
  });

  it('returns 404 when session not found', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'nonexistent' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when session has no transcript', async () => {
    vi.mocked(getSession).mockResolvedValue({ ...mockSession, transcript: null });

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no transcript/i);
  });

  it('generates free plan report with freeSessionsUsed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport as any);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' } as any);

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('テストレポート');
    expect(generateReport).toHaveBeenCalledWith(mockSession.transcript, 'free', 0);
  });

  it('generates paid plan report', async () => {
    vi.mocked(getReportPlan).mockReturnValue('paid');
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport as any);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' } as any);

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(200);
    expect(generateReport).toHaveBeenCalledWith(mockSession.transcript, 'paid', 0);
  });

  it('passes correct freeSessionsUsed for trial user', async () => {
    vi.mocked(getProfile).mockResolvedValue({ free_sessions_used: 2, plan: 'free' } as any);
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport as any);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' } as any);

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(200);
    expect(generateReport).toHaveBeenCalledWith(mockSession.transcript, 'free', 2);
  });

  it('returns 500 when generateReport throws', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockRejectedValue(new Error('Gemini error'));
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, status: 'generating' } as any);

    const res = await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(res.status).toBe(500);
  });

  it('increments session count after successful generation', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(generateReport).mockResolvedValue(mockReport as any);
    vi.mocked(updateSession).mockResolvedValue({ ...mockSession, report: mockReport, status: 'completed' } as any);

    await request(app)
      .post('/api/report')
      .set('Authorization', `Bearer ${MOCK_TOKEN}`)
      .send({ session_id: 'sess-1' });

    expect(incrementSessionCount).toHaveBeenCalledWith(MOCK_USER_ID);
  });
});
