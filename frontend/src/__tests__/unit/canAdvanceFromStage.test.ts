import { describe, it, expect } from 'vitest';
import { canAdvanceFromStage } from '../../types/coaching';
import type {
  Stage1LogicalData,
  Stage1EmotionalData,
  Stage2Data,
  Stage3Data,
  Stage4Data,
} from '../../types/coaching';

// ──── Stage 1 Logical ────

const validLogical: Stage1LogicalData = {
  central_problem: '転職すべきかどうか',
  current_situation: '現在の職場で3年間働いているが成長を感じない',
  key_factors: ['スキルアップの機会が少ない', '年収が低い'],
  constraints: ['住宅ローンがある'],
  uncertainty_points: ['転職後の年収'],
  decision_needed: '転職するかどうかを決める',
  priority_candidates: ['IT系企業', 'コンサル'],
};

describe('canAdvanceFromStage - Stage 1 Logical', () => {
  it('returns canAdvance: true when all fields are present and confidence >= 0.7', () => {
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', validLogical, 0.8);
    expect(canAdvance).toBe(true);
    expect(reasons).toHaveLength(0);
  });

  it('returns false when central_problem is null', () => {
    const d = { ...validLogical, central_problem: null };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('問題'))).toBe(true);
  });

  it('returns false when central_problem is empty string', () => {
    const d = { ...validLogical, central_problem: '   ' };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', d, 0.8);
    expect(canAdvance).toBe(false);
  });

  it('returns false when current_situation is null', () => {
    const d = { ...validLogical, current_situation: null };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('現状'))).toBe(true);
  });

  it('returns false when key_factors is empty', () => {
    const d = { ...validLogical, key_factors: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('論点'))).toBe(true);
  });

  it('returns false when decision_needed is null', () => {
    const d = { ...validLogical, decision_needed: null };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('決める'))).toBe(true);
  });

  it('returns false when confidence < 0.7', () => {
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', validLogical, 0.69);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('深度'))).toBe(true);
  });

  it('returns true when confidence is exactly 0.7', () => {
    const { canAdvance } = canAdvanceFromStage(1, 'logical', validLogical, 0.7);
    expect(canAdvance).toBe(true);
  });
});

// ──── Stage 1 Emotional ────

const validEmotional: Stage1EmotionalData = {
  primary_emotions: ['不安', '焦り'],
  emotional_triggers: ['上司との対立'],
  inner_conflicts: ['変わりたいが怖い'],
  unmet_needs: ['承認欲求'],
  desired_emotional_state: '穏やかで自信がある状態',
  resistance_points: [],
};

describe('canAdvanceFromStage - Stage 1 Emotional', () => {
  it('returns canAdvance: true when all fields are present and confidence >= 0.7', () => {
    const { canAdvance } = canAdvanceFromStage(1, 'emotional', validEmotional, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false when primary_emotions is empty', () => {
    const d = { ...validEmotional, primary_emotions: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'emotional', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('感情'))).toBe(true);
  });

  it('returns false when emotional_triggers is empty', () => {
    const d = { ...validEmotional, emotional_triggers: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'emotional', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('きっかけ'))).toBe(true);
  });

  it('returns false when both inner_conflicts and unmet_needs are empty', () => {
    const d = { ...validEmotional, inner_conflicts: [], unmet_needs: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'emotional', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('言語化'))).toBe(true);
  });

  it('returns true when inner_conflicts is empty but unmet_needs has items', () => {
    const d = { ...validEmotional, inner_conflicts: [] };
    const { canAdvance } = canAdvanceFromStage(1, 'emotional', d, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false when desired_emotional_state is null', () => {
    const d = { ...validEmotional, desired_emotional_state: null };
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'emotional', d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('状態'))).toBe(true);
  });

  it('returns false when confidence < 0.7', () => {
    const { canAdvance } = canAdvanceFromStage(1, 'emotional', validEmotional, 0.5);
    expect(canAdvance).toBe(false);
  });
});

// ──── Stage 2 ────

const validStage2: Stage2Data = {
  goal_type: 'quantitative',
  goal_statement: '6ヶ月以内に転職して年収を20%上げる',
  metric: '年収',
  target_value: '20%増',
  deadline: '6ヶ月後',
  observable_signs: [],
  why_this_goal_matters: '家族を養うため',
  previous_stage_mode: 'logical',
};

describe('canAdvanceFromStage - Stage 2', () => {
  it('returns canAdvance: true for valid quantitative goal', () => {
    const { canAdvance } = canAdvanceFromStage(2, null, validStage2, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false when goal_type is null', () => {
    const d = { ...validStage2, goal_type: null } as Stage2Data;
    const { canAdvance, reasons } = canAdvanceFromStage(2, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('種類'))).toBe(true);
  });

  it('returns false when goal_statement is null', () => {
    const d = { ...validStage2, goal_statement: null };
    const { canAdvance, reasons } = canAdvanceFromStage(2, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('言語化'))).toBe(true);
  });

  it('returns false for quantitative when both metric and deadline are null', () => {
    const d = { ...validStage2, metric: null, deadline: null };
    const { canAdvance, reasons } = canAdvanceFromStage(2, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('達成指標'))).toBe(true);
  });

  it('returns true for quantitative when metric exists even without deadline', () => {
    const d = { ...validStage2, deadline: null };
    const { canAdvance } = canAdvanceFromStage(2, null, d, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false for qualitative when observable_signs is empty', () => {
    const d: Stage2Data = {
      ...validStage2,
      goal_type: 'qualitative',
      observable_signs: [],
      why_this_goal_matters: '意味があるから',
    };
    const { canAdvance, reasons } = canAdvanceFromStage(2, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('観察'))).toBe(true);
  });

  it('returns false for qualitative when why_this_goal_matters is null', () => {
    const d: Stage2Data = {
      ...validStage2,
      goal_type: 'qualitative',
      observable_signs: ['笑顔が増える'],
      why_this_goal_matters: null,
    };
    const { canAdvance, reasons } = canAdvanceFromStage(2, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('意味'))).toBe(true);
  });

  it('returns false when confidence < 0.7', () => {
    const { canAdvance } = canAdvanceFromStage(2, null, validStage2, 0.6);
    expect(canAdvance).toBe(false);
  });
});

// ──── Stage 3 ────

const validStage3: Stage3Data = {
  action_candidates: ['転職エージェントに登録', 'ポートフォリオ作成'],
  selected_action: '転職エージェントに登録する',
  budget: '0円',
  available_time: '週5時間',
  resources: ['LinkedIn'],
  obstacles: ['時間が足りない'],
  obstacles_acknowledged: true,
  first_step: '今週中にエージェント登録',
  execution_frequency: '週1回',
};

describe('canAdvanceFromStage - Stage 3', () => {
  it('returns canAdvance: true when all fields are valid', () => {
    const { canAdvance } = canAdvanceFromStage(3, null, validStage3, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false when action_candidates is empty', () => {
    const d = { ...validStage3, action_candidates: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(3, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('行動候補'))).toBe(true);
  });

  it('returns false when selected_action is null', () => {
    const d = { ...validStage3, selected_action: null };
    const { canAdvance, reasons } = canAdvanceFromStage(3, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('行動が決まっていない'))).toBe(true);
  });

  it('returns false when first_step is null', () => {
    const d = { ...validStage3, first_step: null };
    const { canAdvance, reasons } = canAdvanceFromStage(3, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('最初'))).toBe(true);
  });

  it('returns false when obstacles_acknowledged is false AND obstacles is empty', () => {
    const d = { ...validStage3, obstacles_acknowledged: false, obstacles: [] };
    const { canAdvance, reasons } = canAdvanceFromStage(3, null, d, 0.8);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('障害'))).toBe(true);
  });

  it('returns true when obstacles_acknowledged is false but obstacles has items', () => {
    const d = { ...validStage3, obstacles_acknowledged: false };
    const { canAdvance } = canAdvanceFromStage(3, null, d, 0.75);
    expect(canAdvance).toBe(true);
  });

  it('returns false when confidence < 0.7', () => {
    const { canAdvance } = canAdvanceFromStage(3, null, validStage3, 0.65);
    expect(canAdvance).toBe(false);
  });
});

// ──── Stage 4 ────

const validStage4: Stage4Data = {
  commitment_statement: '毎週エージェントと面談し転職活動を続ける',
  self_efficacy_level: 7,
  perceived_resistance: '多少の不安はあるが前向き',
  identity_alignment: '成長する自分',
  reinforcement_message: 'できると信じる',
  next_check_in_point: '1ヶ月後',
};

describe('canAdvanceFromStage - Stage 4', () => {
  it('returns canAdvance: true when all fields valid and self_efficacy >= 6, confidence >= 0.8', () => {
    const { canAdvance } = canAdvanceFromStage(4, null, validStage4, 0.85);
    expect(canAdvance).toBe(true);
  });

  it('returns false when commitment_statement is null', () => {
    const d = { ...validStage4, commitment_statement: null };
    const { canAdvance, reasons } = canAdvanceFromStage(4, null, d, 0.85);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('コミットメント'))).toBe(true);
  });

  it('returns false when self_efficacy_level is 5 (below threshold)', () => {
    const d = { ...validStage4, self_efficacy_level: 5 };
    const { canAdvance, reasons } = canAdvanceFromStage(4, null, d, 0.85);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('自己効力感'))).toBe(true);
  });

  it('returns true when self_efficacy_level is exactly 6', () => {
    const d = { ...validStage4, self_efficacy_level: 6 };
    const { canAdvance } = canAdvanceFromStage(4, null, d, 0.85);
    expect(canAdvance).toBe(true);
  });

  it('returns false when self_efficacy_level is null', () => {
    const d = { ...validStage4, self_efficacy_level: null };
    const { canAdvance, reasons } = canAdvanceFromStage(4, null, d, 0.85);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('自己効力感'))).toBe(true);
  });

  it('returns false when confidence < 0.8', () => {
    const { canAdvance, reasons } = canAdvanceFromStage(4, null, validStage4, 0.79);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('深度'))).toBe(true);
  });

  it('returns true when confidence is exactly 0.8', () => {
    const { canAdvance } = canAdvanceFromStage(4, null, validStage4, 0.8);
    expect(canAdvance).toBe(true);
  });
});

// ──── Edge cases ────

describe('canAdvanceFromStage - edge cases', () => {
  it('returns false when extractedData is null', () => {
    const { canAdvance, reasons } = canAdvanceFromStage(1, 'logical', null, 0.9);
    expect(canAdvance).toBe(false);
    expect(reasons.some((r) => r.includes('データ'))).toBe(true);
  });

  it('returns false when extractedData is undefined', () => {
    const { canAdvance } = canAdvanceFromStage(1, 'logical', undefined, 0.9);
    expect(canAdvance).toBe(false);
  });

  it('returns false for unknown stage', () => {
    const { canAdvance } = canAdvanceFromStage(99 as 1, null, validLogical, 0.9);
    expect(canAdvance).toBe(false);
  });
});
