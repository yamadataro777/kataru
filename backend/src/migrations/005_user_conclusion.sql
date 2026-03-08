-- Add user_conclusion column to sessions table
-- Allows users to write their own conclusion after reading the AI report
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_conclusion text DEFAULT NULL;
