import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

// vi.hoisted ensures these are initialized before vi.mock factory runs
const mockOrder = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn(() => ({ order: mockOrder })));
const mockFrom = vi.hoisted(() => vi.fn(() => ({ select: mockSelect })));

vi.mock('../../services/supabase', () => ({
  supabase: { from: mockFrom },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Re-wire the chain after clearAllMocks
  mockFrom.mockImplementation(() => ({ select: mockSelect }));
  mockSelect.mockImplementation(() => ({ order: mockOrder }));
});

describe('GET /api/analytics', () => {
  it('returns zero stats for empty session list', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.total_sessions).toBe(0);
    expect(res.body.total_words).toBe(0);
    expect(res.body.recent_topics).toEqual([]);
  });

  it('aggregates word counts and topic counts', async () => {
    const sessions = [
      {
        id: 's1',
        word_count: 100,
        duration_seconds: 60,
        created_at: '2026-03-01T00:00:00Z',
        status: 'completed',
        report: {
          title: 'レポート1',
          summary: 'まとめ',
          topics: ['仕事', 'キャリア'],
          sentiment: { overall: 'positive' },
          action_items: ['アクション1'],
        },
      },
      {
        id: 's2',
        word_count: 200,
        duration_seconds: 120,
        created_at: '2026-03-02T00:00:00Z',
        status: 'completed',
        report: {
          title: 'レポート2',
          summary: 'まとめ2',
          topics: ['仕事', '人間関係'],
          sentiment: { overall: 'neutral' },
          action_items: [],
        },
      },
    ];
    mockOrder.mockResolvedValue({ data: sessions, error: null });

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.total_sessions).toBe(2);
    expect(res.body.total_words).toBe(300);
    expect(res.body.avg_duration).toBe(90);
    // 仕事 appears in both, should have count 2
    const topicCounts: { topic: string; count: number }[] = res.body.topic_counts;
    const workTopic = topicCounts.find((t) => t.topic === '仕事');
    expect(workTopic?.count).toBe(2);
    // Sentiment distribution
    expect(res.body.sentiment_distribution.positive).toBe(1);
    expect(res.body.sentiment_distribution.neutral).toBe(1);
  });

  it('returns recent sessions (up to 5)', async () => {
    const sessions = Array.from({ length: 7 }, (_, i) => ({
      id: `s${i}`,
      word_count: 50,
      duration_seconds: 30,
      created_at: `2026-03-0${i + 1}T00:00:00Z`,
      status: 'completed',
      report: {
        title: `レポート${i}`,
        summary: `まとめ${i}`,
        topics: [],
        sentiment: { overall: 'neutral' },
        action_items: [],
      },
    }));
    mockOrder.mockResolvedValue({ data: sessions, error: null });

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.recent_sessions.length).toBeLessThanOrEqual(5);
  });

  it('returns 500 when supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
