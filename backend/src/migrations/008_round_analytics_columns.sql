-- Add analytics columns to round_rounds for quality tracking
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS question_angle TEXT;
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT 'v1';
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS used_previous_ratings BOOLEAN DEFAULT false;
