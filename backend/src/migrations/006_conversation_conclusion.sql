-- Add user_conclusion column to conversations table
-- Allows users to write their own conclusion after dialogue sessions
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_conclusion text DEFAULT NULL;
