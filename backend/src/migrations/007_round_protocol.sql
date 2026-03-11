-- 007: Round Protocol Tables
-- 3ラウンド制思考整理プロトコル用テーブル

-- セッション親テーブル
CREATE TABLE IF NOT EXISTS public.round_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  selected_duration INT NOT NULL,
  total_rounds INT DEFAULT 0,
  session_memory JSONB,
  summary JSONB,
  session_rating INT,
  completed_at TIMESTAMPTZ
);

-- 各ラウンドの記録
CREATE TABLE IF NOT EXISTS public.round_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.round_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  duration_sec INT NOT NULL,
  transcript TEXT,
  transcript_length INT,
  mirror TEXT,
  question TEXT,
  question_rating TEXT,
  latency_ms INT,
  used_fallback BOOLEAN DEFAULT false,
  memory JSONB,
  UNIQUE(session_id, round_number)
);

-- イベントログ
CREATE TABLE IF NOT EXISTS public.round_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.round_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  round_number INT,
  data JSONB DEFAULT '{}'
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_round_sessions_user_id ON public.round_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_round_rounds_session_id ON public.round_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_round_events_session_id ON public.round_events(session_id);

-- RLS有効化
ALTER TABLE public.round_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_events ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: round_sessions
CREATE POLICY "Users can view own round sessions"
  ON public.round_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own round sessions"
  ON public.round_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own round sessions"
  ON public.round_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLSポリシー: round_rounds (session所有者のみ)
CREATE POLICY "Users can view own round rounds"
  ON public.round_rounds FOR SELECT
  USING (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own round rounds"
  ON public.round_rounds FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own round rounds"
  ON public.round_rounds FOR UPDATE
  USING (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));

-- RLSポリシー: round_events (session所有者のみ)
CREATE POLICY "Users can view own round events"
  ON public.round_events FOR SELECT
  USING (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own round events"
  ON public.round_events FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));

-- Service roleバイパス（バックエンドからの書き込み用）
-- SUPABASE_SERVICE_KEYを使用するバックエンドはRLSをバイパスするため、
-- 上記ポリシーはクライアント直接アクセス時のガードとして機能する。
