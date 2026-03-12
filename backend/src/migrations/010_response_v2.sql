-- 010: Thinking Companion Phase 1 — response_v2 columns
-- Echo/Sense/Next形式のレスポンスと分析メタデータを追加

ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS response_v2 JSONB;
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS depth_used INT DEFAULT 1;
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS mode_primary TEXT;
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS mode_secondary TEXT;
