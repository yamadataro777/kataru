import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test parseLLMResponse by importing it via CoachingService internals.
// Since parseLLMResponse is a private module-level function, we test its
// behavior through the public CoachingService.processCoachingTurn path,
// OR we extract the logic in a unit-friendly way.
// Here we duplicate the logic for pure unit testing:

type CoachingStage = 1 | 2 | 3 | 4;
type StageMode = 'logical' | 'emotional';

interface CoachingTurnResponse {
  current_stage: CoachingStage;
  current_stage_mode: StageMode | null;
  assistant_message: string;
  can_advance: boolean;
  advance_reason: string | null;
  missing_requirements: string[];
  stage_summary: string;
  extracted_data: Record<string, unknown>;
  confidence: number;
  should_regress_stage: boolean;
  regress_to_stage: 1 | 2 | 3 | null;
  regress_reason: string | null;
  should_suggest_mode_switch: boolean;
  suggested_mode: StageMode | null;
  mode_switch_reason: string | null;
}

const DEFAULT_FALLBACK: CoachingTurnResponse = {
  current_stage: 1,
  current_stage_mode: null,
  assistant_message: 'なるほど、もう少し教えていただけますか？',
  can_advance: false,
  advance_reason: null,
  missing_requirements: [],
  stage_summary: '',
  extracted_data: {},
  confidence: 0,
  should_regress_stage: false,
  regress_to_stage: null,
  regress_reason: null,
  should_suggest_mode_switch: false,
  suggested_mode: null,
  mode_switch_reason: null,
};

function parseLLMResponse(
  raw: string,
  stage: CoachingStage,
  mode: StageMode | null
): CoachingTurnResponse {
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr.trim()) as Record<string, unknown>;

    if (typeof parsed.assistant_message !== 'string') throw new Error('invalid: missing assistant_message');
    if (typeof parsed.can_advance !== 'boolean') throw new Error('invalid: missing can_advance');

    return {
      current_stage: (parsed.current_stage as CoachingStage) ?? stage,
      current_stage_mode: (parsed.current_stage_mode as StageMode | null) ?? mode,
      assistant_message: parsed.assistant_message,
      can_advance: parsed.can_advance,
      advance_reason: (parsed.advance_reason as string | null) ?? null,
      missing_requirements: Array.isArray(parsed.missing_requirements) ? (parsed.missing_requirements as string[]) : [],
      stage_summary: typeof parsed.stage_summary === 'string' ? parsed.stage_summary : '',
      extracted_data: (parsed.extracted_data as Record<string, unknown>) ?? {},
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      should_regress_stage: (parsed.should_regress_stage as boolean) ?? false,
      regress_to_stage: (parsed.regress_to_stage as 1 | 2 | 3 | null) ?? null,
      regress_reason: (parsed.regress_reason as string | null) ?? null,
      should_suggest_mode_switch: (parsed.should_suggest_mode_switch as boolean) ?? false,
      suggested_mode: (parsed.suggested_mode as StageMode | null) ?? null,
      mode_switch_reason: (parsed.mode_switch_reason as string | null) ?? null,
    };
  } catch {
    return { ...DEFAULT_FALLBACK, current_stage: stage, current_stage_mode: mode };
  }
}

const validResponse = {
  current_stage: 1,
  current_stage_mode: 'logical',
  assistant_message: 'どんな問題について話しますか？',
  can_advance: false,
  advance_reason: null,
  missing_requirements: ['central_problem'],
  stage_summary: '',
  extracted_data: { central_problem: null },
  confidence: 0.6,
  should_regress_stage: false,
  regress_to_stage: null,
  regress_reason: null,
  should_suggest_mode_switch: false,
  suggested_mode: null,
  mode_switch_reason: null,
};

describe('parseLLMResponse', () => {
  it('parses valid JSON string', () => {
    const raw = JSON.stringify(validResponse);
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.assistant_message).toBe('どんな問題について話しますか？');
    expect(result.can_advance).toBe(false);
    expect(result.confidence).toBe(0.6);
  });

  it('parses JSON wrapped in markdown code block', () => {
    const raw = '```json\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.assistant_message).toBe('どんな問題について話しますか？');
  });

  it('parses JSON wrapped in plain code block', () => {
    const raw = '```\n' + JSON.stringify(validResponse) + '\n```';
    const result = parseLLMResponse(raw, 1, 'logical');
    expect(result.assistant_message).toBe('どんな問題について話しますか？');
  });

  it('returns fallback when JSON is completely invalid', () => {
    const result = parseLLMResponse('not valid json at all', 2, 'emotional');
    expect(result.can_advance).toBe(false);
    expect(result.current_stage).toBe(2);
    expect(result.current_stage_mode).toBe('emotional');
    expect(result.assistant_message).toBe('なるほど、もう少し教えていただけますか？');
  });

  it('returns fallback when assistant_message is missing', () => {
    const broken = { ...validResponse };
    delete (broken as Record<string, unknown>)['assistant_message'];
    const result = parseLLMResponse(JSON.stringify(broken), 1, null);
    expect(result.can_advance).toBe(false);
    expect(result.current_stage).toBe(1);
  });

  it('returns fallback when can_advance is missing', () => {
    const broken = { ...validResponse };
    delete (broken as Record<string, unknown>)['can_advance'];
    const result = parseLLMResponse(JSON.stringify(broken), 1, 'logical');
    expect(result.can_advance).toBe(false);
  });

  it('uses stage and mode from call args when missing in JSON', () => {
    const minimal = {
      assistant_message: 'テスト',
      can_advance: true,
    };
    const result = parseLLMResponse(JSON.stringify(minimal), 3, null);
    expect(result.current_stage).toBe(3);
    expect(result.current_stage_mode).toBeNull();
  });

  it('defaults missing_requirements to empty array', () => {
    const noReqs = { ...validResponse };
    delete (noReqs as Record<string, unknown>)['missing_requirements'];
    const result = parseLLMResponse(JSON.stringify(noReqs), 1, 'logical');
    expect(result.missing_requirements).toEqual([]);
  });

  it('defaults confidence to 0 when missing', () => {
    const noConf = { ...validResponse };
    delete (noConf as Record<string, unknown>)['confidence'];
    const result = parseLLMResponse(JSON.stringify(noConf), 1, 'logical');
    expect(result.confidence).toBe(0);
  });

  it('handles can_advance: true correctly', () => {
    const advanceable = { ...validResponse, can_advance: true, confidence: 0.9 };
    const result = parseLLMResponse(JSON.stringify(advanceable), 1, 'logical');
    expect(result.can_advance).toBe(true);
    expect(result.confidence).toBe(0.9);
  });
});
