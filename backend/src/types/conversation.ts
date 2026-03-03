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

export interface Stage4Data {
  commitment_statement: string | null;
  self_efficacy_level: number | null;
  perceived_resistance: string | null;
  identity_alignment: string | null;
  reinforcement_message: string | null;
  next_check_in_point: string | null;
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
}
