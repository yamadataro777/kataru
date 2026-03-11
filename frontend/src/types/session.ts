export interface Session {
  id: string;
  created_at: string;
  duration_seconds: number | null;
  audio_url: string | null;
  audio_file_path: string | null;
  transcript: string | null;
  word_count: number | null;
  report: Report | null;
  status: 'recording' | 'uploading' | 'transcribing' | 'generating' | 'completed' | 'error';
  error_message: string | null;
  user_conclusion: string | null;
}

export interface Report {
  title: string;
  summary: string;
  key_insights: string[];
  topics: string[];
  sentiment: { overall: string; score: number; details: string };
  action_items?: string[];
  contradictions?: string[];
  thinking_pattern?: string;
  structure?: { sections: { heading: string; content: string }[] };
  exploration_questions?: string[];
  deep_questions?: Array<{
    question: string;
    context: string;
    angle: string;
  }>;
  blockage?: string;
  discussion_points?: string[];
  next_step?: string;
}
