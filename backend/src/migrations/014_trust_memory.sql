-- Phase 8: Trust Memory
-- profiles.trust_memory: ユーザーの傾向記憶（JSONB, optional）
-- round_sessions.trust_memory_snapshot: R1 preload 時のスナップショット（merge 用）

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_memory JSONB DEFAULT NULL;

ALTER TABLE public.round_sessions
  ADD COLUMN IF NOT EXISTS trust_memory_snapshot JSONB DEFAULT NULL;

-- Compare-and-Swap RPC（stale write 防止）
-- DELETE 後の復活を防ぐ: trust_memory = null の場合 version が存在しないため WHERE にマッチしない
CREATE OR REPLACE FUNCTION save_trust_memory_cas(
  p_user_id UUID,
  p_new_tm JSONB,
  p_expected_version INT
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  IF p_expected_version = 0 THEN
    UPDATE profiles SET trust_memory = p_new_tm
    WHERE id = p_user_id AND trust_memory IS NULL;
  ELSE
    UPDATE profiles SET trust_memory = p_new_tm
    WHERE id = p_user_id AND (trust_memory->>'version')::int = p_expected_version;
  END IF;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;
