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
}

export interface Report {
  title: string;
  summary: string;
  key_insights: string[];
  topics: string[];
  sentiment: { overall: string; score: number; details: string };
  action_items: string[];
  structure: { sections: { heading: string; content: string }[] };
}
