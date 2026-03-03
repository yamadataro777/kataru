import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

const mockInsert = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn(() => ({ insert: mockInsert })));

vi.mock('../../services/supabase', () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation(() => ({ insert: mockInsert }));
});

describe('POST /api/feedback', () => {
  it('accepts valid feedback and returns 201', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const res = await request(app)
      .post('/api/feedback')
      .send({ score: 4, comment: '使いやすいです', suggestion: 'もっと機能を増やして' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('feedback');
  });

  it('returns 400 when score is missing', async () => {
    const res = await request(app).post('/api/feedback').send({ comment: 'good' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score/i);
  });

  it('returns 400 when score is 0 (below minimum)', async () => {
    const res = await request(app).post('/api/feedback').send({ score: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score/i);
  });

  it('returns 400 when score is 6 (above maximum)', async () => {
    const res = await request(app).post('/api/feedback').send({ score: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/score/i);
  });

  it('accepts score at boundary values (1 and 5)', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const res1 = await request(app).post('/api/feedback').send({ score: 1 });
    expect(res1.status).toBe(201);

    const res5 = await request(app).post('/api/feedback').send({ score: 5 });
    expect(res5.status).toBe(201);
  });

  it('returns 500 when supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB write error') });

    const res = await request(app).post('/api/feedback').send({ score: 3 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('saves device_id when provided', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const res = await request(app)
      .post('/api/feedback')
      .send({ score: 3, device_id: 'device-abc-123' });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ device_id: 'device-abc-123' })
    );
  });
});
