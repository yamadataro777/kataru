-- Phase 7: Maybe Slot (idempotent)
ALTER TABLE round_rounds ADD COLUMN IF NOT EXISTS maybe_fired BOOLEAN DEFAULT false;
