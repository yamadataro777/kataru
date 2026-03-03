import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

vi.mock('../../services/conversation', () => ({
  createConversation: vi.fn(),
  getConversations: vi.fn(),
  getConversationWithTurns: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock('../../services/dialogue', () => ({
  processTurn: vi.fn(),
  generateFinalReport: vi.fn(),
  createInitialTurn: vi.fn(),
}));

import {
  createConversation,
  getConversations,
  getConversationWithTurns,
  deleteConversation,
} from '../../services/conversation';
import { processTurn, generateFinalReport, createInitialTurn } from '../../services/dialogue';

const mockConversation = {
  id: 'conv-1',
  phase: 'intake',
  turn_count: 0,
  status: 'active',
  running_context: {
    topics: [],
    emotional_tones: [],
    defense_mechanisms: [],
    key_phrases: [],
    readiness_for_change: 0,
    self_awareness_depth: 0,
    turn_summaries: [],
    phase_turns: {},
  },
  final_report: null,
  ended_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

const mockInitialTurn = {
  id: 'turn-0',
  conversation_id: 'conv-1',
  turn_number: 0,
  user_transcript: null,
  audio_url: null,
  ai_response: 'こんにちは。今日はどんなことについて話しましょうか？',
  question_type: 'coaching',
  phase: 'intake',
  metadata: {},
  extracted: null,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/conversations', () => {
  it('creates conversation with initial turn and returns 201', async () => {
    vi.mocked(createConversation).mockResolvedValue(mockConversation);
    vi.mocked(createInitialTurn).mockResolvedValue({
      turn: mockInitialTurn,
      conversation: mockConversation,
    });

    const res = await request(app).post('/api/conversations');

    expect(res.status).toBe(201);
    expect(res.body.conversation.id).toBe('conv-1');
    expect(res.body.turn.ai_response).toContain('こんにちは');
    expect(createInitialTurn).toHaveBeenCalledWith('conv-1');
  });

  it('returns 500 when createConversation throws', async () => {
    vi.mocked(createConversation).mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/api/conversations');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/conversations', () => {
  it('returns conversation list', async () => {
    vi.mocked(getConversations).mockResolvedValue([mockConversation]);

    const res = await request(app).get('/api/conversations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('conv-1');
  });
});

describe('GET /api/conversations/:id', () => {
  it('returns conversation with turns', async () => {
    const withTurns = { ...mockConversation, conversation_turns: [mockInitialTurn] };
    vi.mocked(getConversationWithTurns).mockResolvedValue(withTurns);

    const res = await request(app).get('/api/conversations/conv-1');

    expect(res.status).toBe(200);
    expect(res.body.conversation_turns).toHaveLength(1);
  });

  it('returns 404 when not found', async () => {
    vi.mocked(getConversationWithTurns).mockResolvedValue(null);

    const res = await request(app).get('/api/conversations/nonexistent');

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/conversations/:id', () => {
  it('deletes conversation and returns 204', async () => {
    vi.mocked(deleteConversation).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/conversations/conv-1');

    expect(res.status).toBe(204);
    expect(deleteConversation).toHaveBeenCalledWith('conv-1');
  });
});

describe('POST /api/conversations/:id/turns', () => {
  it('processes turn with client transcript', async () => {
    const responseTurn = {
      ...mockInitialTurn,
      id: 'turn-1',
      turn_number: 1,
      user_transcript: '最近仕事が辛いです',
      ai_response: 'なるほど、どのような点が辛いと感じますか？',
    };
    const updatedConv = { ...mockConversation, turn_count: 1 };
    vi.mocked(processTurn).mockResolvedValue({ turn: responseTurn, conversation: updatedConv });

    const res = await request(app)
      .post('/api/conversations/conv-1/turns')
      .send({ transcript: '最近仕事が辛いです' });

    expect(res.status).toBe(200);
    expect(res.body.turn.ai_response).toBeDefined();
    expect(processTurn).toHaveBeenCalledWith(
      'conv-1',
      undefined,
      undefined,
      '最近仕事が辛いです'
    );
  });

  it('returns 500 when processTurn throws', async () => {
    vi.mocked(processTurn).mockRejectedValue(new Error('Gemini failed'));

    const res = await request(app)
      .post('/api/conversations/conv-1/turns')
      .send({ transcript: 'テスト' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('includes crisis_detected in metadata when crisis keywords found', async () => {
    const crisisTurn = {
      ...mockInitialTurn,
      id: 'turn-crisis',
      metadata: { crisis_detected: true, crisis_keywords: ['死にたい'] },
    };
    vi.mocked(processTurn).mockResolvedValue({ turn: crisisTurn, conversation: mockConversation });

    const res = await request(app)
      .post('/api/conversations/conv-1/turns')
      .send({ transcript: '死にたいと思う' });

    expect(res.status).toBe(200);
    expect(res.body.turn.metadata.crisis_detected).toBe(true);
  });
});

describe('POST /api/conversations/:id/end', () => {
  it('ends conversation and returns final report', async () => {
    const finalConv = { ...mockConversation, status: 'ended', ended_at: '2026-01-01T01:00:00Z' };
    const report = {
      title: '対話レポート',
      summary: 'テストのまとめ',
      key_insights: [],
      topics: ['仕事'],
      emotional_journey: '不安 → 明確',
      patterns_discovered: [],
      identity_narrative: '',
      action_items: [],
      growth_areas: [],
      structure: { sections: [] },
    };
    vi.mocked(generateFinalReport).mockResolvedValue({ conversation: finalConv, report });

    const res = await request(app).post('/api/conversations/conv-1/end');

    expect(res.status).toBe(200);
    expect(res.body.report.title).toBe('対話レポート');
    expect(res.body.conversation.status).toBe('ended');
  });
});
