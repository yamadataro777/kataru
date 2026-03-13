-- 015: Session Extension (Phase 9)
-- ユーザー選択式延長: 最大許可ラウンド数をサーバーが管理

-- セッション単位の延長許可状態
ALTER TABLE public.round_sessions
  ADD COLUMN IF NOT EXISTS max_rounds_allowed INT DEFAULT 3;

ALTER TABLE public.round_sessions
  ADD CONSTRAINT chk_max_rounds_allowed
  CHECK (max_rounds_allowed >= 3 AND max_rounds_allowed <= 5);

-- ラウンド番号の硬い天井
ALTER TABLE public.round_rounds
  ADD CONSTRAINT chk_round_number_range
  CHECK (round_number >= 1 AND round_number <= 5);

-- R4/R5 の INSERT を max_rounds_allowed で原子的に拒否するトリガー
CREATE OR REPLACE FUNCTION check_round_extension_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- R1-R3: 常に許可（既存フローに影響なし）
  IF NEW.round_number <= 3 THEN
    RETURN NEW;
  END IF;

  -- R4-R5: max_rounds_allowed を確認
  IF EXISTS (
    SELECT 1 FROM round_sessions
    WHERE id = NEW.session_id
      AND max_rounds_allowed >= NEW.round_number
  ) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Round % not allowed: session extension required', NEW.round_number
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_round_extension
  BEFORE INSERT ON round_rounds
  FOR EACH ROW
  EXECUTE FUNCTION check_round_extension_allowed();

-- 延長許可を原子的に1段上げる RPC
CREATE OR REPLACE FUNCTION extend_session(p_session_id UUID, p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE round_sessions
  SET max_rounds_allowed = LEAST(max_rounds_allowed + 1, 5)
  WHERE id = p_session_id
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id = '00000000-0000-0000-0000-000000000000'))
    AND max_rounds_allowed < 5
  RETURNING max_rounds_allowed INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Extension not allowed: already at max or session not found'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql;
