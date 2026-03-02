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
