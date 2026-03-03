'use client';

// ==========================================
// COACHING SYSTEM TYPES (4-Stage Flow)
// ==========================================

export type CoachingStage = 1 | 2 | 3 | 4;
export type StageMode = 'logical' | 'emotional';
export type UIState = 'MODE_SELECT' | 'RECORDING' | 'PROCESSING' | 'STAGE_COMPLETE' | 'SESSION_COMPLETE';

export interface Stage1LogicalData {
  central_problem: string | null;
  current_situation: string | null;
  key_factors: string[];
  constraints: string[];
  uncertainty_points: string[];
  decision_needed: string | null;
  priority_candidates: string[];
}

export interface Stage1EmotionalData {
  primary_emotions: string[];
  emotional_triggers: string[];
  inner_conflicts: string[];
  unmet_needs: string[];
  desired_emotional_state: string | null;
  resistance_points: string[];
}

export interface Stage2Data {
  goal_type: 'quantitative' | 'qualitative' | null;
  goal_statement: string | null;
  metric: string | null;
  target_value: string | null;
  deadline: string | null;
  observable_signs: string[];
  why_this_goal_matters: string | null;
  previous_stage_mode: 'logical' | 'emotional' | null;
}

export interface Stage3Data {
  action_candidates: string[];
  selected_action: string | null;
  budget: string | null;
  available_time: string | null;
  resources: string[];
  obstacles: string[];
  obstacles_acknowledged: boolean;
  first_step: string | null;
  execution_frequency: string | null;
}

export interface Stage4Data {
  commitment_statement: string | null;
  self_efficacy_level: number | null;
  perceived_resistance: string | null;
  identity_alignment: string | null;
  reinforcement_message: string | null;
  next_check_in_point: string | null;
}

export type StageExtractedData =
  | Stage1LogicalData
  | Stage1EmotionalData
  | Stage2Data
  | Stage3Data
  | Stage4Data;

export interface CoachingTurnResponse {
  current_stage: CoachingStage;
  current_stage_mode: StageMode | null;
  assistant_message: string;
  can_advance: boolean;
  advance_reason: string | null;
  missing_requirements: string[];
  stage_summary: string;
  extracted_data: StageExtractedData;
  confidence: number;
  should_regress_stage: boolean;
  regress_to_stage: 1 | 2 | 3 | null;
  regress_reason: string | null;
  should_suggest_mode_switch: boolean;
  suggested_mode: StageMode | null;
  mode_switch_reason: string | null;
}

export interface CoachingTurn {
  id: string;
  conversation_id: string;
  turn_number: number;
  user_transcript: string | null;
  audio_url: string | null;
  ai_response: string;
  current_stage: CoachingStage;
  stage_mode: StageMode | null;
  coaching_response: CoachingTurnResponse | null;
  created_at: string;
}

export interface CoachingConversation {
  id: string;
  status: string;
  current_stage: CoachingStage;
  stage_mode: StageMode | null;
  stage_summaries: Record<string, string>;
  stage_extracted_data: Record<string, StageExtractedData | null>;
  can_advance: boolean;
  turn_count: number;
  final_report: any | null;
  created_at: string;
  updated_at: string;
}

export interface CoachingDialogueState {
  conversationId: string | null;
  currentStage: CoachingStage;
  stageMode: StageMode | null;
  turns: CoachingTurn[];
  lastLLMResponse: CoachingTurnResponse | null;
  canAdvance: boolean;
  missingRequirements: string[];
  stageSummaries: Record<string, string>;
  extractedData: Record<string, StageExtractedData | null>;
  modeSwitchSuggestion: {
    visible: boolean;
    suggestedMode: StageMode | null;
    reason: string | null;
  };
  uiState: UIState;
  error: string | null;
  isWaking: boolean;
  wakingProgress: number;
}

// ==========================================
// GATE VALIDATION (Frontend double-gate)
// ==========================================

export function canAdvanceFromStage(
  stage: number,
  mode: StageMode | null,
  extractedData: StageExtractedData | null | undefined,
  confidence: number
): { canAdvance: boolean; reasons: string[] } {
  if (!extractedData) return { canAdvance: false, reasons: ['データが取得できていません'] };

  if (stage === 1 && mode === 'logical') {
    const d = extractedData as Stage1LogicalData;
    const reasons: string[] = [];
    if (!d.central_problem?.trim()) reasons.push('中心となる問題が明確でない');
    if (!d.current_situation?.trim()) reasons.push('現状認識が不明確');
    if (d.key_factors.length < 1) reasons.push('主要な論点が挙がっていない');
    if (!d.decision_needed?.trim()) reasons.push('何を決める必要があるかが不明');
    if (confidence < 0.7) reasons.push('整理の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 1 && mode === 'emotional') {
    const d = extractedData as Stage1EmotionalData;
    const reasons: string[] = [];
    if (d.primary_emotions.length < 1) reasons.push('主要な感情が特定できていない');
    if (d.emotional_triggers.length < 1) reasons.push('感情のきっかけが不明確');
    if (d.inner_conflicts.length < 1 && d.unmet_needs.length < 1) reasons.push('内的な引っかかりがまだ言語化されていない');
    if (!d.desired_emotional_state?.trim()) reasons.push('どんな状態になりたいかが不明確');
    if (confidence < 0.7) reasons.push('感情整理の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 2) {
    const d = extractedData as Stage2Data;
    const reasons: string[] = [];
    if (!d.goal_type) reasons.push('目標の種類（定量/定性）が未確定');
    if (!d.goal_statement?.trim()) reasons.push('目標が言語化されていない');
    if (d.goal_type === 'quantitative' && !d.metric && !d.deadline)
      reasons.push('達成指標または期限が必要');
    if (d.goal_type === 'qualitative' && d.observable_signs.length < 1)
      reasons.push('達成を観察できる変化が明確でない');
    if (d.goal_type === 'qualitative' && !d.why_this_goal_matters)
      reasons.push('この目標の意味・理由が不明確');
    if (confidence < 0.7) reasons.push('目標の明確度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 3) {
    const d = extractedData as Stage3Data;
    const reasons: string[] = [];
    if (d.action_candidates.length < 1) reasons.push('行動候補が出ていない');
    if (!d.selected_action?.trim()) reasons.push('実行する行動が決まっていない');
    if (!d.first_step?.trim()) reasons.push('最初のアクションが不明確');
    if (!d.obstacles_acknowledged && d.obstacles.length === 0)
      reasons.push('障害の有無を確認していない');
    if (confidence < 0.7) reasons.push('行動設計の具体性が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  if (stage === 4) {
    const d = extractedData as Stage4Data;
    const reasons: string[] = [];
    if (!d.commitment_statement?.trim()) reasons.push('コミットメント宣言が未完了');
    if (!d.self_efficacy_level || d.self_efficacy_level < 6)
      reasons.push('自己効力感がまだ低い（6以上が必要）');
    if (confidence < 0.8) reasons.push('確定の深度が不十分');
    return { canAdvance: reasons.length === 0, reasons };
  }

  return { canAdvance: false, reasons: ['不明なStage'] };
}

// Parse LLM response with fallback
export function parseLLMResponse(raw: any, stage: CoachingStage, mode: StageMode | null): CoachingTurnResponse {
  const fallback: CoachingTurnResponse = {
    current_stage: stage,
    current_stage_mode: mode,
    assistant_message: 'なるほど、もう少し教えていただけますか？',
    can_advance: false,
    advance_reason: null,
    missing_requirements: [],
    stage_summary: '',
    extracted_data: {} as StageExtractedData,
    confidence: 0,
    should_regress_stage: false,
    regress_to_stage: null,
    regress_reason: null,
    should_suggest_mode_switch: false,
    suggested_mode: null,
    mode_switch_reason: null,
  };

  try {
    if (!raw || typeof raw !== 'object') return fallback;
    if (typeof raw.assistant_message !== 'string') return fallback;
    return {
      current_stage: raw.current_stage ?? stage,
      current_stage_mode: raw.current_stage_mode ?? mode,
      assistant_message: raw.assistant_message,
      can_advance: raw.can_advance ?? false,
      advance_reason: raw.advance_reason ?? null,
      missing_requirements: Array.isArray(raw.missing_requirements) ? raw.missing_requirements : [],
      stage_summary: raw.stage_summary ?? '',
      extracted_data: raw.extracted_data ?? {},
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
      should_regress_stage: raw.should_regress_stage ?? false,
      regress_to_stage: raw.regress_to_stage ?? null,
      regress_reason: raw.regress_reason ?? null,
      should_suggest_mode_switch: raw.should_suggest_mode_switch ?? false,
      suggested_mode: raw.suggested_mode ?? null,
      mode_switch_reason: raw.mode_switch_reason ?? null,
    };
  } catch {
    return fallback;
  }
}
