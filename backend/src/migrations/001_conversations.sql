-- Kataru Conversation Engine Tables
-- Run this in Supabase SQL Editor

CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  phase            TEXT NOT NULL DEFAULT 'intake',
  turn_count       INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active',
  running_context  JSONB NOT NULL DEFAULT '{}',
  final_report     JSONB,
  ended_at         TIMESTAMPTZ
);

CREATE TABLE conversation_turns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  turn_number      INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_transcript  TEXT,
  audio_url        TEXT,
  extracted        JSONB,
  ai_response      TEXT NOT NULL,
  question_type    TEXT,
  phase            TEXT NOT NULL,
  metadata         JSONB DEFAULT '{}'
);

CREATE INDEX idx_turns_conv ON conversation_turns(conversation_id, turn_number);
