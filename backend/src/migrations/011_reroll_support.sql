-- Phase 3: Reroll support
-- Adds reroll_count to round_rounds and DELETE policy

ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS reroll_count INT DEFAULT 0;

-- idempotent: check existing policy before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'round_rounds' AND policyname = 'Users can delete own round rounds'
  ) THEN
    CREATE POLICY "Users can delete own round rounds"
      ON public.round_rounds FOR DELETE
      USING (session_id IN (SELECT id FROM public.round_sessions WHERE user_id = auth.uid()));
  END IF;
END $$;
