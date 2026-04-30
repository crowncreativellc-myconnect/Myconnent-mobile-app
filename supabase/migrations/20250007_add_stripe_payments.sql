-- Migration: Stripe Connect payments
-- Adds payment_proposals and stripe_connect_accounts tables, RLS policies,
-- the canonical fee calculation function, and the on-paid trigger that wires
-- payments into the existing points + chat system.
--
-- Deploy AFTER 20250004_add_chat_system.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Extend chats with payment status ────────────────────────────────────────
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS payment_status      TEXT,
  ADD COLUMN IF NOT EXISTS payment_proposal_id UUID,
  ADD COLUMN IF NOT EXISTS total_paid_cents    INTEGER NOT NULL DEFAULT 0;

-- ─── Extend chat_messages with typed message support ─────────────────────────
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_type        TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'payment_proposal', 'payment_confirmed', 'system')),
  ADD COLUMN IF NOT EXISTS payment_proposal_id UUID;

CREATE INDEX IF NOT EXISTS chat_messages_payment_proposal_idx
  ON chat_messages (payment_proposal_id)
  WHERE payment_proposal_id IS NOT NULL;

-- ─── payment_proposals ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_proposals (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id                  UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  shout_id                 UUID        NOT NULL REFERENCES shouts(id) ON DELETE CASCADE,
  proposed_by_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents             INTEGER     NOT NULL CHECK (amount_cents > 0),
  currency                 TEXT        NOT NULL DEFAULT 'usd',
  description              TEXT        NOT NULL,
  service_fee_cents        INTEGER     NOT NULL,
  platform_fee_cents       INTEGER     NOT NULL,
  provider_receives_cents  INTEGER     NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_payment', 'processing', 'paid',
                      'failed', 'refunded', 'disputed', 'cancelled')),
  stripe_payment_intent_id TEXT        UNIQUE,
  stripe_transfer_id       TEXT,
  client_secret            TEXT,
  paid_at                  TIMESTAMPTZ,
  points_awarded           BOOLEAN     NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Penny-perfect invariant: fee + provider net always equals gross.
  CONSTRAINT payment_proposals_amount_balanced
    CHECK (service_fee_cents + provider_receives_cents = amount_cents)
);

ALTER TABLE chats
  ADD CONSTRAINT chats_payment_proposal_fk
    FOREIGN KEY (payment_proposal_id)
    REFERENCES payment_proposals(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payment_proposals_chat_idx
  ON payment_proposals (chat_id);
CREATE INDEX IF NOT EXISTS payment_proposals_client_idx
  ON payment_proposals (client_id);
CREATE INDEX IF NOT EXISTS payment_proposals_provider_idx
  ON payment_proposals (proposed_by_id);
CREATE INDEX IF NOT EXISTS payment_proposals_status_idx
  ON payment_proposals (status);

ALTER TABLE payment_proposals ENABLE ROW LEVEL SECURITY;

-- Only the two parties to the proposal can read it.
CREATE POLICY "proposal_select_parties" ON payment_proposals
  FOR SELECT USING (
    auth.uid() = proposed_by_id OR auth.uid() = client_id
  );

-- Only chat participants can create a proposal — and only as themselves.
-- Both the proposer and the named client must be participants of the chat.
CREATE POLICY "proposal_insert_participants" ON payment_proposals
  FOR INSERT WITH CHECK (
    proposed_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = payment_proposals.chat_id
        AND auth.uid()                = ANY(c.participant_ids)
        AND payment_proposals.client_id = ANY(c.participant_ids)
    )
  );

-- No client-side updates: only the service role (Edge Functions / webhooks)
-- can mutate a proposal once created. RLS denies UPDATE by default.

-- ─── stripe_connect_accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  user_id              UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id    TEXT        NOT NULL UNIQUE,
  charges_enabled      BOOLEAN     NOT NULL DEFAULT false,
  payouts_enabled      BOOLEAN     NOT NULL DEFAULT false,
  onboarding_complete  BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only read their own connect account.
CREATE POLICY "connect_account_select_own" ON stripe_connect_accounts
  FOR SELECT USING (user_id = auth.uid());

-- Insert and update strictly via the service role through Edge Functions.
-- (No client-side INSERT / UPDATE policy — RLS blocks both by default.)

-- ─── calculate_mykonnect_fee — single source of truth ───────────────────────
-- Uses FLOOR (not ROUND) so service_fee + provider_receives == amount exactly.
CREATE OR REPLACE FUNCTION calculate_mykonnect_fee(p_amount_cents INTEGER)
RETURNS TABLE (service_fee_cents INTEGER, provider_receives_cents INTEGER)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fee INTEGER;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be a positive integer';
  END IF;

  v_fee := FLOOR(p_amount_cents * 0.08)::INTEGER;
  service_fee_cents := v_fee;
  provider_receives_cents := p_amount_cents - v_fee;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_mykonnect_fee(INTEGER) TO authenticated;

-- ─── on_payment_proposal_paid trigger ───────────────────────────────────────
-- Fires when a proposal flips to 'paid'. Idempotent via points_awarded guard.
CREATE OR REPLACE FUNCTION handle_payment_proposal_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only react on transition into 'paid' AND when not already processed.
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid')
     AND NEW.points_awarded = false THEN

    -- Update the chat: payment status + total + mark job complete.
    UPDATE chats
    SET payment_status      = 'paid',
        payment_proposal_id = NEW.id,
        total_paid_cents    = COALESCE(total_paid_cents, 0) + NEW.amount_cents,
        job_marked_complete = true
    WHERE id = NEW.chat_id;

    -- Award completion points (idempotent inside award_completion_points).
    PERFORM award_completion_points(NEW.chat_id);

    -- System message announcing payment received + points awarded.
    INSERT INTO chat_messages (
      chat_id, sender_id, body, is_system_message, message_type, payment_proposal_id
    ) VALUES (
      NEW.chat_id,
      NULL,
      '✓ Payment received. Konnect Points have been awarded to both parties. Thank you for using MyKonnect.',
      true,
      'payment_confirmed',
      NEW.id
    );

    -- Mark proposal as having awarded points so a duplicate webhook is a no-op.
    NEW.points_awarded := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_proposal_paid ON payment_proposals;
CREATE TRIGGER on_payment_proposal_paid
  BEFORE UPDATE ON payment_proposals
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_proposal_paid();
