-- Phase 6: Depth Control (idempotent + 既存データ耐性)
-- depth_used column は 010_response_v2.sql で作成済み (INT DEFAULT 1)

-- 1. 既存データの異常値を安全な値に修正（制約追加前に実行）
UPDATE round_rounds
SET depth_used = 1
WHERE depth_used IS NOT NULL AND (depth_used < 1 OR depth_used > 3);

-- 2. CHECK 制約を idempotent に追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'round_rounds_depth_used_check'
      AND t.relname = 'round_rounds'
  ) THEN
    ALTER TABLE round_rounds
    ADD CONSTRAINT round_rounds_depth_used_check
    CHECK (depth_used IS NULL OR depth_used BETWEEN 1 AND 3);
  END IF;
END $$;
