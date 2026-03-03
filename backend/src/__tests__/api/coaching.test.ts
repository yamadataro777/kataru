import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

// Mock the coachingService singleton and conversation helpers
vi.mock('../../services/coaching', () => {
  const mockCoachingService = {
    createSession: vi.fn(),
    getInitialMessage: vi.fn(),
    processCoachingTurn: vi.fn(),
    advanceStage: vi.fn(),
    generateCoachingReport: vi.fn(),
  };
  return {
    coachingService: mockCoachingService,
    // Re-export getConversations so coaching.ts route can import it
    getConversations: vi.fn(),
  };
});

vi.mock('../../services/conversation', () => ({
  getConversations: vi.fn(),
  getConversationWithTurns: vi.fn(),
}));

import { coachingService } from '../../services/coaching';
import { getConversations, getConversationWithTurns } from '../../services/conversation';

const mockCoachingConversation = {
  id: 'coach-1',
  status: 'active',
  current_stage: 1,
  stage_mode: null,
  stage_summaries: {},
  stage_extracted_data: { '1': null, '2': null, '3': null, '4': null },
  can_advance: false,
  turn_count: 0,
  final_report: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockInitialResponse = {
  current_stage: 1,
  current_stage_mode: 'logical',
  assistant_message: 'どんな問題について話しますか？',
  can_advance: false,
  advance_reason: null,
  missing_requirements: ['central_problem'],
  stage_summary: '',
  extracted_data: { central_problem: null, current_situation: null, key_factors: [], constraints: [], uncertainty_points: [], decision_needed: null, priority_candidates: [] },
  confidence: 0,
  should_regress_stage: false,
  regress_to_stage: null,
  regress_reason: null,
  should_suggest_mode_switch: false,
  suggested_mode: null,
  mode_switch_reason: null,
};

const mockTurn = {
  id: 'turn-1',
  conversation_id: 'coach-1',
  turn_number: 1,
  user_transcript: '仕事の方向性で悩んでいます',
  audio_url: null,
  ai_response: 'なるほど、具体的にどのような点で悩まれていますか？',
  current_stage: 1,
  stage_mode: 'logical',
  coaching_response: mockInitialResponse,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/coaching', () => {
  it('creates session and returns 201 with initial stage', async () => {
    vi.mocked(coachingService.createSession).mockResolvedValue(mockCoachingConversation);

    const res = await request(app).post('/api/coaching');

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('coach-1');
    expect(res.body.current_stage).toBe(1);
    expect(res.body.stage_mode).toBeNull();
    expect(coachingService.createSession).toHaveBeenCalledOnce();
  });

  it('returns 500 when createSession throws', async () => {
    vi.mocked(coachingService.createSession).mockRejectedValue(new Error('DB error'));

    const res = await request(app).post('/api/coaching');

    expect(res.status).toBe(500);
  });
});

describe('POST /api/coaching/:id/initial', () => {
  it('returns initial message for stage 1 logical', async () => {
    vi.mocked(coachingService.getInitialMessage).mockResolvedValue(mockInitialResponse);

    const res = await request(app)
      .post('/api/coaching/coach-1/initial')
      .send({ stage: '1', mode: 'logical' });

    expect(res.status).toBe(200);
    expect(res.body.assistant_message).toBeDefined();
    expect(res.body.current_stage).toBe(1);
    expect(coachingService.getInitialMessage).toHaveBeenCalledWith('coach-1', 1, 'logical');
  });

  it('returns 400 when stage is missing', async () => {
    const res = await request(app)
      .post('/api/coaching/coach-1/initial')
      .send({ mode: 'logical' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stage/i);
  });
});

describe('POST /api/coaching/:id/turns', () => {
  it('processes turn with transcript and returns response', async () => {
    vi.mocked(coachingService.processCoachingTurn).mockResolvedValue({
      turn: mockTurn,
      response: mockInitialResponse,
    });

    const res = await request(app)
      .post('/api/coaching/coach-1/turns')
      .send({ transcript: '仕事の方向性で悩んでいます', stage: '1', mode: 'logical' });

    expect(res.status).toBe(200);
    expect(res.body.turn).toBeDefined();
    expect(res.body.response).toBeDefined();
    expect(coachingService.processCoachingTurn).toHaveBeenCalledWith(
      'coach-1',
      1,
      'logical',
      undefined,
      undefined,
      '仕事の方向性で悩んでいます'
    );
  });

  it('returns 400 when stage is missing', async () => {
    const res = await request(app)
      .post('/api/coaching/coach-1/turns')
      .send({ transcript: 'テスト' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stage/i);
  });

  it('returns 400 when stage=1 and mode is missing', async () => {
    const res = await request(app)
      .post('/api/coaching/coach-1/turns')
      .send({ transcript: 'テスト', stage: '1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mode/i);
  });

  it('allows stage > 1 without mode', async () => {
    const stage2Response = { ...mockInitialResponse, current_stage: 2, current_stage_mode: null };
    vi.mocked(coachingService.processCoachingTurn).mockResolvedValue({
      turn: { ...mockTurn, current_stage: 2 },
      response: stage2Response,
    });

    const res = await request(app)
      .post('/api/coaching/coach-1/turns')
      .send({ transcript: '目標は売上20%増です', stage: '2' });

    expect(res.status).toBe(200);
  });

  it('returns 500 when LLM fails (error propagated)', async () => {
    vi.mocked(coachingService.processCoachingTurn).mockRejectedValue(new Error('Gemini error'));

    const res = await request(app)
      .post('/api/coaching/coach-1/turns')
      .send({ transcript: 'テスト', stage: '1', mode: 'logical' });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/coaching/:id/advance', () => {
  it('advances to next stage and returns initial message', async () => {
    const stage2Initial = { ...mockInitialResponse, current_stage: 2, current_stage_mode: null };
    vi.mocked(coachingService.advanceStage).mockResolvedValue(stage2Initial);

    const res = await request(app)
      .post('/api/coaching/coach-1/advance')
      .send({ nextStage: '2' });

    expect(res.status).toBe(200);
    expect(res.body.current_stage).toBe(2);
    expect(coachingService.advanceStage).toHaveBeenCalledWith('coach-1', 2, undefined);
  });

  it('returns 400 when nextStage is missing', async () => {
    const res = await request(app).post('/api/coaching/coach-1/advance').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nextStage/i);
  });
});

describe('POST /api/coaching/:id/end', () => {
  it('ends session and returns report', async () => {
    const mockReport = {
      title: 'コーチングセッションレポート',
      summary: '仕事の方向性を明確にした',
      key_insights: ['キャリアの目標が明確になった'],
      topics: ['仕事', 'キャリア'],
      emotional_journey: '不安 → 明確',
      patterns_discovered: [],
      identity_narrative: '',
      action_items: ['週次レビューを設定する'],
      growth_areas: [],
      structure: { sections: [] },
    };
    vi.mocked(coachingService.generateCoachingReport).mockResolvedValue(mockReport);

    const res = await request(app).post('/api/coaching/coach-1/end');

    expect(res.status).toBe(200);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.title).toBe('コーチングセッションレポート');
    expect(coachingService.generateCoachingReport).toHaveBeenCalledWith('coach-1');
  });

  it('returns 500 when report generation fails', async () => {
    vi.mocked(coachingService.generateCoachingReport).mockRejectedValue(new Error('Gemini error'));

    const res = await request(app).post('/api/coaching/coach-1/end');

    expect(res.status).toBe(500);
  });
});
