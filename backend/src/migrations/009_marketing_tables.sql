CREATE TABLE marketing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  goal TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  canvas JSONB NOT NULL DEFAULT '{}',
  total_rounds INTEGER NOT NULL DEFAULT 0,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE marketing_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  transcript TEXT,
  transcript_length INTEGER,
  duration_sec INTEGER DEFAULT 0,
  input_type TEXT NOT NULL DEFAULT 'voice'
    CHECK (input_type IN ('voice', 'text')),
  question_type TEXT
    CHECK (question_type IN ('gap_fill', 'hypothesis_compress', 'validation_design')),
  question TEXT,
  mirror TEXT,
  question_rating TEXT
    CHECK (question_rating IN ('hit', 'neutral', 'off')),
  canvas_updates JSONB,
  question_target_field TEXT,
  latency_ms INTEGER,
  used_fallback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mkt_sessions_user ON marketing_sessions(user_id);
CREATE INDEX idx_mkt_rounds_session ON marketing_rounds(session_id);

ALTER TABLE marketing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own marketing_sessions" ON marketing_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users manage own marketing_rounds" ON marketing_rounds
  FOR ALL USING (session_id IN (
    SELECT id FROM marketing_sessions WHERE user_id = auth.uid() OR user_id IS NULL
  ));
