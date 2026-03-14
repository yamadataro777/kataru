-- Phase 10: Domain Adapters
-- adapter_id: 領域アダプタ識別子 (marketing, career, retrospective)
-- adapter_source: 設定経路 (manual = ユーザー選択, auto = R1 transcript 自動検出)

ALTER TABLE public.round_sessions
  ADD COLUMN IF NOT EXISTS adapter_id TEXT DEFAULT NULL;

ALTER TABLE public.round_sessions
  ADD COLUMN IF NOT EXISTS adapter_source TEXT DEFAULT NULL;

-- 個別値の制約
ALTER TABLE public.round_sessions
  ADD CONSTRAINT chk_adapter_id
  CHECK (adapter_id IS NULL OR adapter_id IN ('marketing', 'career', 'retrospective'));

ALTER TABLE public.round_sessions
  ADD CONSTRAINT chk_adapter_source
  CHECK (adapter_source IS NULL OR adapter_source IN ('manual', 'auto'));

-- ペア整合制約: 両方nullか両方非nullでなければならない
ALTER TABLE public.round_sessions
  ADD CONSTRAINT chk_adapter_pair_consistency
  CHECK (
    (adapter_id IS NULL AND adapter_source IS NULL)
    OR
    (adapter_id IS NOT NULL AND adapter_source IS NOT NULL)
  );
