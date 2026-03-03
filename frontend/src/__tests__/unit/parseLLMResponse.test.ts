import { describe, it, expect } from 'vitest';
import { parseLLMResponse } from '../../types/coaching';
import type { CoachingTurnResponse } from '../../types/coaching';

// The frontend parseLLMResponse takes an object (already parsed JSON from API response),
// not a raw string — see coaching.ts line 210.

const validRaw: CoachingTurnResponse = {
  current_stage: 1,
  current_stage_mode: 'logical',
  assistant_message: 'どんな問題について話しますか？',
  can_advance: false,
  advance_reason: null,
  missing_requirements: ['central_problem'],
  stage_summary: '',
  extracted_data: {
    central_problem: null,
    current_situation: null,
    key_factors: [],
    constraints: [],
    uncertainty_points: [],
    decision_needed: null,
    priority_candidates: [],
  } as any,
  confidence: 0.6,
  should_regress_stage: false,
  regress_to_stage: null,
  regress_reason: null,
  should_suggest_mode_switch: false,
  suggested_mode: null,
  mode_switch_reason: null,
};

describe('parseLLMResponse (frontend)', () => {
  it('returns the response when assistant_message is present', () => {
    const result = parseLLMResponse(validRaw, 1, 'logical');
    expect(result.assistant_message).toBe('どんな問題について話しますか？');
    expect(result.can_advance).toBe(false);
    expect(result.confidence).toBe(0.6);
  });

  it('uses passed stage and mode as defaults when missing in raw', () => {
    const minimal = {
      assistant_message: '続けてください',
      can_advance: true,
    };
    const result = parseLLMResponse(minimal, 2, null);
    expect(result.current_stage).toBe(2);
    expect(result.current_stage_mode).toBeNull();
    expect(result.can_advance).toBe(true);
  });

  it('returns fallback when raw is null', () => {
    const result = parseLLMResponse(null, 1, 'logical');
    expect(result.can_advance).toBe(false);
    expect(result.current_stage).toBe(1);
    expect(result.assistant_message).toBe('なるほど、もう少し教えていただけますか？');
  });

  it('returns fallback when raw is undefined', () => {
    const result = parseLLMResponse(undefined, 2, 'emotional');
    expect(result.can_advance).toBe(false);
    expect(result.current_stage).toBe(2);
    expect(result.current_stage_mode).toBe('emotional');
  });

  it('returns fallback when assistant_message is not a string', () => {
    const bad = { ...validRaw, assistant_message: 123 };
    const result = parseLLMResponse(bad, 1, 'logical');
    expect(result.can_advance).toBe(false);
    expect(result.assistant_message).toBe('なるほど、もう少し教えていただけますか？');
  });

  it('defaults missing_requirements to empty array', () => {
    const raw = { ...validRaw, missing_requirements: undefined };
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.missing_requirements).toEqual([]);
  });

  it('defaults confidence to 0 when missing', () => {
    const raw = { ...validRaw, confidence: undefined };
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.confidence).toBe(0);
  });

  it('defaults can_advance to false when missing', () => {
    const raw = { ...validRaw, can_advance: undefined };
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.can_advance).toBe(false);
  });

  it('preserves mode_switch fields', () => {
    const raw = {
      ...validRaw,
      should_suggest_mode_switch: true,
      suggested_mode: 'emotional' as const,
      mode_switch_reason: '感情的な側面が強い',
    };
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.should_suggest_mode_switch).toBe(true);
    expect(result.suggested_mode).toBe('emotional');
    expect(result.mode_switch_reason).toBe('感情的な側面が強い');
  });

  it('defaults mode_switch fields to false/null when missing', () => {
    const raw = {
      assistant_message: 'テスト',
      can_advance: false,
    };
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.should_suggest_mode_switch).toBe(false);
    expect(result.suggested_mode).toBeNull();
    expect(result.mode_switch_reason).toBeNull();
  });

  it('preserves regress_stage fields', () => {
    const raw = {
      ...validRaw,
      should_regress_stage: true,
      regress_to_stage: 1 as const,
      regress_reason: '問題の定義に戻る必要がある',
    };
    const result = parseLLMResponse(raw, 2, null);
    expect(result.should_regress_stage).toBe(true);
    expect(result.regress_to_stage).toBe(1);
    expect(result.regress_reason).toBe('問題の定義に戻る必要がある');
  });
});
