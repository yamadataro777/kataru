'use client';

// ==========================================
// COACHING SYSTEM TYPES (4-Stage Flow)
// ==========================================

export type CoachingStage = 1 | 2 | 3 | 4;

// --- Utterance Analysis Types (mirrors backend) ---

export interface IssueItem {
  id: string;
  description: string;
  type: 'decision' | 'action_blocked' | 'emotional' | 'external_constraint';
  urgency: 'immediate' | 'near' | 'distant';
  active: boolean;
}

export interface AmbiguousTerm {
  term: string;
  context: string;
  resolved: boolean;
  resolved_as?: string;
}

export interface EmotionalSignals {
  explicit: string[];
  implicit: string[];
  intensity: 'low' | 'medium' | 'high';
  acknowledged: boolean;
}

export interface GoalHierarchy {
  ultimate: string | null;
  intermediate: string[];
  means_only: string[];
}

export interface QuestionCandidate {
  text: string;
  target_slot: string;
  anchoring_phrase: string | null;
  contextuality: number;
  information_gain: number;
  stage_transition_value: number;
  interrogation_risk: number;
  question_function: QuestionFunction;
}

export interface UtteranceAnalysis {
  issues_detected: IssueItem[];
  emotional_signals: EmotionalSignals;
  ambiguous_terms: AmbiguousTerm[];
  goals_mentioned: Array<{ content: string; is_means_not_goal: boolean }>;
  priority_clarified: boolean;
  question_candidates?: QuestionCandidate[] | null;
  hypothesis_statement?: string | null;
  goal_readiness?: GoalReadiness;
  remaining_gaps_for_stage2?: string[];
  stage_transition_bias?: number;
  user_denied_previous?: boolean;  // ユーザーが直前の仮説/質問を否定したか
  // Transcript normalization (Stage 4)
  transcript_normalization_confidence?: number | null;
  normalized_terms?: NormalizedTermEntry[];
  needs_user_confirmation_for_term?: string | null;
  // Theory discussion mode
  theory_topic_detected?: string | null;  // LLM が検出した理論概念名（例: "ニーチェの永劫回帰"）
}
export type QuestionFunction = 'clarify_detail' | 'narrow_scope' | 'choose_focus' | 'define_term' | 'summarize_confirm' | 'convergence_check' | 'bridge_to_goal' | 'hypothesis_check';
export type GoalReadiness = 'not_ready' | 'approaching' | 'ready';

export type StageMode = 'logical' | 'emotional';
export type UIState = 'MODE_SELECT' | 'RECORDING' | 'TRANSCRIBING' | 'PROCESSING' | 'STAGE_COMPLETE' | 'SESSION_COMPLETE';

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

export type Stage4Path = 'fast' | 'standard' | 'recovery';
export type IdentityPromptType = 'clarity' | 'relationship_integrity' | 'pride' | 'escape_pattern';
export type NegativeDeltaCause =
  | 'action_too_large' | 'commitment_too_heavy' | 'timeline_pressure' | 'reality_shock'
  | 'comparison_spiral' | 'plan_too_large' | 'social_risk_spike'
  | null;
export type NegativeDeltaResponseType = 'quantity_reduce' | 'wording_lighten' | 'timeframe_extend_or_environment_shift' | 'comparison_reframe' | null;

export type RecoverySubpath = 'regress' | 'light_commit' | 'commit' | null;
export type MedicalSafetySeverity = 'none' | 'moderate' | 'severe' | null;
export type ReviewAxisType = 'execution_check' | 'goal_approach' | 'obstacle_recurrence';
export type ClosingSummaryStyle = 'fast' | 'standard' | 'recovery_light_commit' | 'safety_shortened';

export interface NormalizedTermEntry {
  original: string;
  normalized: string;
  confidence: number;
}

export interface Stage4Data {
  stage4_path: Stage4Path | null;
  self_efficacy_level_initial: number | null;
  self_efficacy_level_final: number | null;
  self_efficacy_delta: number | null;
  commitment_statement: string | null;
  perceived_resistance: string | null;
  resistance_reframe: string | null;
  identity_alignment: string | null;
  identity_prompt_type: IdentityPromptType | null;
  reinforcement_message: string | null;
  next_check_in_point: string | null;
  review_axes: string[];
  should_return_to_stage3: boolean;
  stage3_resize_hint: string | null;
  negative_delta_cause: NegativeDeltaCause;
  negative_delta_response_type: NegativeDeltaResponseType;
  medical_safety_note: string | null;
  self_efficacy_level: number | null;  // 後方互換（= initial）
  // #1 Transcript normalization
  transcript_normalization_confidence?: number | null;
  normalized_terms?: NormalizedTermEntry[];
  needs_user_confirmation_for_term?: string | null;
  // #2 Recovery light commit
  recovery_subpath?: RecoverySubpath;
  // #3 Negative delta strengthening
  negative_delta_occurred?: boolean;
  delta_recovered_to_nonnegative?: boolean;
  requires_priority_followup?: boolean;
  soft_complete?: boolean;
  // #4 Medical safety severity
  medical_safety_severity?: MedicalSafetySeverity;
  stage4_shortened_for_safety?: boolean;
  // #5 Review axes standardization
  review_axis_types?: ReviewAxisType[];
  review_axis_quality_score?: number | null;
  // #6 Path-specific closing
  closing_summary_style?: ClosingSummaryStyle | null;
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
  utterance_analysis?: UtteranceAnalysis; // LLMが出力する発話解析（デバッグ用）
  goal_readiness?: GoalReadiness;
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
// バックエンドが権威。フロントエンドはバックエンドの can_advance を信頼する。
// missing_requirements はバックエンドから来た詳細理由を優先して表示する。
// ==========================================

export function canAdvanceFromStage(
  _stage: number,
  _mode: StageMode | null,
  _extractedData: StageExtractedData | null | undefined,
  _confidence: number,
  backendCanAdvance?: boolean,
  backendMissingRequirements?: string[]
): { canAdvance: boolean; reasons: string[] } {
  // バックエンドの判定が提供されている場合はそちらを権威とする
  if (backendCanAdvance !== undefined) {
    return {
      canAdvance: backendCanAdvance,
      reasons: backendMissingRequirements ?? [],
    };
  }

  // バックエンドの判定が未提供の場合（初期表示など）は false で待機
  return { canAdvance: false, reasons: [] };
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
      utterance_analysis: raw.utterance_analysis ?? undefined,
    };
  } catch {
    return fallback;
  }
}
