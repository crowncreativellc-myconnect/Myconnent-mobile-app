-- Migration: in-app chat system
-- Requires: uuid-ossp extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── blocked_users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage_own_blocks" ON blocked_users
  FOR ALL USING (blocker_id = auth.uid());

-- ─── chats ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id            UUID        NOT NULL UNIQUE REFERENCES shouts(id) ON DELETE CASCADE,
  participant_ids     UUID[]      NOT NULL,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  is_locked           BOOLEAN     NOT NULL DEFAULT false,
  locked_reason       TEXT,
  job_marked_complete BOOLEAN     NOT NULL DEFAULT false,
  points_awarded      BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at     TIMESTAMPTZ
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_chat" ON chats
  FOR SELECT USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "participants_update_chat" ON chats
  FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- ─── chat_messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id               UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  body                  TEXT        NOT NULL,
  is_read               BOOLEAN     NOT NULL DEFAULT false,
  is_system_message     BOOLEAN     NOT NULL DEFAULT false,
  is_flagged            BOOLEAN     NOT NULL DEFAULT false,
  moderation_risk_score NUMERIC(4,3),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read all messages in their chats
CREATE POLICY "participants_select_messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- Participants can send messages when chat is active and they are not blocked
CREATE POLICY "participants_send_messages" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_id
        AND auth.uid() = ANY(c.participant_ids)
        AND c.is_active = true
        AND c.is_locked = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      JOIN chats c ON c.id = chat_id
      WHERE bu.blocked_id = auth.uid()
        AND bu.blocker_id = ANY(c.participant_ids)
        AND bu.blocker_id != auth.uid()
    )
  );

-- Participants can mark messages as read — no delete policy
CREATE POLICY "participants_update_messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_id AND auth.uid() = ANY(c.participant_ids)
    )
  );

-- ─── chat_reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_reports (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id          UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id       UUID        REFERENCES chat_messages(id) ON DELETE SET NULL,
  reporter_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT        NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_reports_insert" ON chat_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "own_reports_select" ON chat_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx
  ON chat_messages (chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx
  ON chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_flagged_idx
  ON chat_messages (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS chats_shout_id_idx
  ON chats (shout_id);

-- ─── create_chat_on_match ─────────────────────────────────────────────────────
-- Called by the matching engine when both parties confirm connection.
CREATE OR REPLACE FUNCTION create_chat_on_match(
  p_shout_id       UUID,
  p_participant_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  INSERT INTO chats (shout_id, participant_ids)
  VALUES (p_shout_id, p_participant_ids)
  RETURNING id INTO v_chat_id;

  INSERT INTO chat_messages (chat_id, sender_id, body, is_system_message)
  VALUES (
    v_chat_id,
    NULL,
    'Connection confirmed. Your private chat is now open. All messages about this shout-out stay inside MyKonnect.',
    true
  );

  RETURN v_chat_id;
END;
$$;

-- ─── award_completion_points ──────────────────────────────────────────────────
-- Idempotent: guarded by points_awarded flag. Calling twice returns false.
CREATE OR REPLACE FUNCTION award_completion_points(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat      RECORD;
  v_shout     RECORD;
  v_fulfiller UUID;
  v_poster    UUID;
BEGIN
  SELECT * INTO v_chat FROM chats WHERE id = p_chat_id FOR UPDATE;
  IF NOT FOUND OR v_chat.points_awarded THEN
    RETURN false;
  END IF;

  SELECT author_id, accepted_by_id INTO v_shout
  FROM shouts WHERE id = v_chat.shout_id;

  v_poster    := v_shout.author_id;
  v_fulfiller := COALESCE(
    v_shout.accepted_by_id,
    (SELECT pid FROM unnest(v_chat.participant_ids) AS t(pid)
     WHERE pid != v_poster LIMIT 1)
  );

  IF v_poster IS NULL OR v_fulfiller IS NULL THEN
    RETURN false;
  END IF;

  -- +50 to fulfiller
  UPDATE profiles SET konnect_points = konnect_points + 50 WHERE id = v_fulfiller;
  INSERT INTO points_ledger (user_id, event_type, delta, balance_after, reference_id, description)
  SELECT v_fulfiller, 'feedback_completion', 50, konnect_points, p_chat_id::text,
         'Job complete — 50 Konnect Points awarded'
  FROM profiles WHERE id = v_fulfiller;

  -- +20 to poster
  UPDATE profiles SET konnect_points = konnect_points + 20 WHERE id = v_poster;
  INSERT INTO points_ledger (user_id, event_type, delta, balance_after, reference_id, description)
  SELECT v_poster, 'feedback_bonus', 20, konnect_points, p_chat_id::text,
         'Connection complete — 20 Konnect Points awarded'
  FROM profiles WHERE id = v_poster;

  UPDATE chats
  SET points_awarded = true, job_marked_complete = true
  WHERE id = p_chat_id;

  RETURN true;
END;
$$;
