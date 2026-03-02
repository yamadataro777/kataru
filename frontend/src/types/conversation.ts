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

export interface ConversationTurn {
  id: string;
  conversation_id: string;
  turn_number: number;
  created_at: string;
  user_transcript: string | null;
  audio_url: string | null;
  ai_response: string;
  question_type: QuestionType | null;
  phase: ConversationPhase;
}

export interface Conversation {
  id: string;
  created_at: string;
  phase: ConversationPhase;
  turn_count: number;
  status: ConversationStatus;
  final_report: ConversationReport | null;
  ended_at: string | null;
  conversation_turns?: ConversationTurn[];
}

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

// Phase labels for UI display
export const PHASE_LABELS: Record<ConversationPhase, string> = {
  intake: '導入',
  clarify: '明確化',
  explore: '探索',
  deepen: '深掘り',
  identity_design: 'アイデンティティ',
  synthesis: '統合',
  action_plan: 'アクション',
  close: '終了',
};

export const PHASE_ORDER: ConversationPhase[] = [
  'intake', 'clarify', 'explore', 'deepen',
  'identity_design', 'synthesis', 'action_plan', 'close',
];
