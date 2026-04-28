-- Migration: add moderation_queue table, violation tracking, and auto-suspend

-- ─── moderation_queue ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_queue (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_text       TEXT        NOT NULL,
  risk_score     NUMERIC(5,4) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  category       TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by    UUID        REFERENCES profiles(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the service role (edge functions) can read or write moderation_queue.
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON moderation_queue USING (false);

-- Index to speed up the 24-hour repeat-offender check
CREATE INDEX IF NOT EXISTS moderation_queue_user_created_idx
  ON moderation_queue (user_id, created_at DESC);

-- ─── violation tracking on profiles ──────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS violation_count  INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended     BOOLEAN NOT NULL DEFAULT false;

-- ─── increment_violation_count ───────────────────────────────────────────────
-- Increments the user's violation count and auto-suspends at 5 violations.
-- Called by the flag-review edge function after a confirmed hard rejection.
CREATE OR REPLACE FUNCTION increment_violation_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    violation_count = violation_count + 1,
    is_suspended    = CASE
                        WHEN violation_count + 1 >= 5 THEN true
                        ELSE is_suspended
                      END
  WHERE id = p_user_id;
END;
$$;
