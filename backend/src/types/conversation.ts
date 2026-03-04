// === Conversation Phases ===
export type ConversationPhase =
  | 'intake'
  | 'clarify'
  | 'explore'
  | 'deepen'
  | 'identity_design'
  | 'synthesis'
  | 'action_plan'
  | 'close';

export type ConversationStatus = 'active' | 'ended';

export type QuestionType = 'coaching' | 'psychoanalytic' | 'identity';

// === Phase Configuration ===
export interface PhaseConfig {
  minTurns: number;
  maxTurns: number;
  next: ConversationPhase | null;
}

export const PHASE_CONFIG: Record<ConversationPhase, PhaseConfig> = {
  intake:          { minTurns: 1, maxTurns: 1, next: 'clarify' },
  clarify:         { minTurns: 1, maxTurns: 2, next: 'explore' },
  explore:         { minTurns: 2, maxTurns: 4, next: 'deepen' },
  deepen:          { minTurns: 2, maxTurns: 3, next: 'identity_design' },
  identity_design: { minTurns: 1, maxTurns: 2, next: 'synthesis' },
  synthesis:       { minTurns: 1, maxTurns: 1, next: 'action_plan' },
  action_plan:     { minTurns: 1, maxTurns: 1, next: 'close' },
  close:           { minTurns: 1, maxTurns: 1, next: null },
};

// === Extracted Features (Gemini Call 1 output) ===
export interface ExtractedFeatures {
  goal?: string;
  pain?: string;
  conflict?: string;
  belief?: string;
  emotional_tone: string;
  defense_mechanisms: string[];
  abstraction_level: 'abstract' | 'concrete' | 'mixed';
  topics: string[];
  readiness_for_change: number;    // 0-1
  self_awareness_depth: number;    // 0-1
  crisis_signals: string[];
  key_phrases: string[];
  turn_summary: string;            // 1行要約
}

// === Question Type Scores ===
export interface QuestionScores {
  coaching: number;       // 0-100
  psychoanalytic: number; // 0-100
  identity: number;       // 0-100
}

// === Running Context (accumulated across turns) ===
export interface RunningContext {
  goal?: string;
  pain?: string;
  conflict?: string;
  belief?: string;
  topics: string[];
  emotional_tones: string[];
  defense_mechanisms: string[];
  key_phrases: string[];
  readiness_for_change: number;
  self_awareness_depth: number;
  turn_summaries: string[];
  phase_turns: Record<ConversationPhase, number>;
  // Coaching system extended fields (optional for backwards compatibility)
  issues_prioritized?: boolean;
  active_issue_id?: string | null;
  all_issues?: IssueItem[];
  ambiguous_terms?: AmbiguousTerm[];
  emotional_signals?: EmotionalSignals;
  goal_hierarchy?: GoalHierarchy;
}

// === Database Row Types ===
export interface Conversation {
  id: string;
  created_at: string;
  phase: ConversationPhase;
  turn_count: number;
  status: ConversationStatus;
  running_context: RunningContext;
  final_report: ConversationReport | null;
  ended_at: string | null;
}

export interface ConversationTurn {
  id: string;
  conversation_id: string;
  turn_number: number;
  created_at: string;
  user_transcript: string | null;
  audio_url: string | null;
  extracted: ExtractedFeatures | null;
  ai_response: string;
  question_type: QuestionType | null;
  phase: ConversationPhase;
  metadata: Record<string, unknown>;
}

// === Conversation with Turns (for GET /:id) ===
export interface ConversationWithTurns extends Conversation {
  conversation_turns: ConversationTurn[];
}

// === Final Report Structure ===
export interface ConversationReport {
  title: string;
  summary: string;
  key_insights: string[];
  topics: string[];
  emotional_journey: string;
  patterns_discovered: string[];
  identity_narrative: string;
  action_items: string[];
  growth_areas: string[];
  structure: {
    sections: Array<{
      heading: string;
      content: string;
    }>;
  };
}

// === API Request/Response Types ===
export interface SendTurnRequest {
  transcript?: string;
}

export interface SendTurnResponse {
  turn: ConversationTurn;
  conversation: Conversation;
}

export interface EndConversationResponse {
  conversation: Conversation;
  report: ConversationReport;
}

// === Crisis Keywords ===
export const CRISIS_KEYWORDS = [
  '死にたい', '自殺', '殺したい', '消えたい',
  '生きていたくない', '死んでしまいたい', '自傷',
];

// ==========================================
// COACHING SYSTEM TYPES (4-Stage Flow)
// ==========================================

export type CoachingStage = 1 | 2 | 3 | 4;

// --- Issue Frame (Stage 1 の問題分類) ---

export type IssueFrame =
  | 'decision_conflict'      // AかBか選べない
  | 'priority_conflict'      // 何を先にやるか決められない
  | 'blocked_action'         // やりたいが何かに阻まれている
  | 'multi_issue_selection'  // 問題が複数あり絞れない
  | 'emotional_overwhelm'    // 感情が強すぎて整理できない
  | 'ambiguity_resolution'   // 曖昧語を解決すべき
  | 'situation_mapping';     // 状況の全体像が見えない

// --- Slot Status (スロット充足度) ---

export type SlotStatusLevel = 'missing' | 'partial' | 'filled';

export interface SlotStatus {
  status: SlotStatusLevel;
  last_evidence: string | null;  // そのスロットを埋めた直近のユーザー発話断片
}

// --- Question Candidate (内部候補) ---

export interface QuestionCandidate {
  text: string;
  target_slot: string;             // どのスロットを狙うか
  anchoring_phrase: string | null; // ユーザー発話からの引用
  contextuality: number;           // 0-10: 文脈追従度
  information_gain: number;        // 0-10: 不確実性削減度
  stage_transition_value: number;  // 0-10: Stage 2 への遷移寄与度
  interrogation_risk: number;      // 0-10: 尋問リスク（高いほど危険）
  question_function: QuestionFunction;
}

// --- Utterance Analysis Types ---

export interface IssueItem {
  id: string;                  // "A", "B", "C"
  description: string;
  type: 'decision' | 'action_blocked' | 'emotional' | 'external_constraint';
  urgency: 'immediate' | 'near' | 'distant';
  active: boolean;             // 現在フォーカス中か
}

export interface AmbiguousTerm {
  term: string;                // "いい大学"
  context: string;             // 使われた文脈
  resolved: boolean;
  resolved_as?: string;        // "QS世界ランキングトップ50"
}

export interface EmotionalSignals {
  explicit: string[];          // ["だるい"]
  implicit: string[];          // ["なかなか手につかない"]
  intensity: 'low' | 'medium' | 'high';
  acknowledged: boolean;       // AI が受容済みか
}

export interface GoalHierarchy {
  ultimate: string | null;     // L1: スタートアップ創業
  intermediate: string[];      // L3: トップ50大学入学
  means_only: string[];        // 目的と誤認された手段
}

export interface UtteranceAnalysis {
  issues_detected: IssueItem[];
  emotional_signals: EmotionalSignals;
  ambiguous_terms: AmbiguousTerm[];
  goals_mentioned: Array<{ content: string; is_means_not_goal: boolean }>;
  priority_clarified: boolean;
  // Stage 1 enhanced fields
  issue_frame: IssueFrame | null;
  slot_statuses: Record<string, SlotStatus> | null;
  question_candidates: QuestionCandidate[] | null;
  question_selection_rationale: string | null;
  hypothesis_statement: string | null;  // このターンで提示する暫定仮説
  anchoring_phrase: string | null;
  answered_slots: string[] | null;     // このターンで部分的にでも答えが出たスロット
  do_not_ask_again: string[] | null;   // 再質問禁止スロット
  goal_readiness?: GoalReadiness;
  remaining_gaps_for_stage2?: string[];
  stage_transition_bias?: number;  // 0-10
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
  transcript_normalization_confidence: number | null;
  normalized_terms: NormalizedTermEntry[];
  needs_user_confirmation_for_term: string | null;
  // #2 Recovery light commit
  recovery_subpath: RecoverySubpath;
  // #3 Negative delta strengthening
  negative_delta_occurred: boolean;
  delta_recovered_to_nonnegative: boolean;
  requires_priority_followup: boolean;
  soft_complete: boolean;
  // #4 Medical safety severity
  medical_safety_severity: MedicalSafetySeverity;
  stage4_shortened_for_safety: boolean;
  // #5 Review axes standardization
  review_axis_types: ReviewAxisType[];
  review_axis_quality_score: number | null;
  // #6 Path-specific closing
  closing_summary_style: ClosingSummaryStyle | null;
}

export type StageExtractedData = Stage1LogicalData | Stage1EmotionalData | Stage2Data | Stage3Data | Stage4Data;

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
  utterance_analysis?: UtteranceAnalysis; // LLMが出力する発話解析
  goal_readiness?: GoalReadiness;
}

export interface CoachingConversation {
  id: string;
  status: ConversationStatus;
  current_stage: CoachingStage;
  stage_mode: StageMode | null;
  stage_summaries: Record<string, string>;
  stage_extracted_data: Record<string, StageExtractedData | null>;
  can_advance: boolean;
  turn_count: number;
  final_report: ConversationReport | null;
  created_at: string;
  updated_at: string;
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

export interface CoachingContext {
  conversationId: string;
  currentStage: CoachingStage;
  stageMode: StageMode | null;
  turnCount: number;
  stageSummaries: Record<string, string>;
  stageExtractedData: Record<string, StageExtractedData | null>;
  recentTurns: CoachingTurn[];
  // Extended fields from running_context
  all_issues?: IssueItem[];
  ambiguous_terms?: AmbiguousTerm[];
  emotional_signals?: EmotionalSignals;
  goal_hierarchy?: GoalHierarchy;
  issues_prioritized?: boolean;
  // Stage 1 enhanced fields
  issue_frame?: IssueFrame | null;
  slot_statuses?: Record<string, SlotStatus> | null;
  do_not_ask_again?: string[] | null;
  goal_readiness?: GoalReadiness;
  // Theory discussion mode
  theory_mode_active?: boolean;
  theory_mode_turn_count?: number;
  theory_mode_concept?: string | null;
}
