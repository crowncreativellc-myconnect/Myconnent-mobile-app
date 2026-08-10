-- ─── 20260811_remove_stripe_payments.sql ────────────────────────────────────
-- Reverses 20250007_add_stripe_payments.sql. Beta pivot: MyKonnect no longer
-- takes a % of professional fees. Payments move off-platform to eliminate
-- fee-split legal exposure for regulated professions (attorneys, doctors,
-- real-estate, etc.). Value ladder becomes subscription-based instead.
--
-- Safe to drop because payment_proposals and stripe_connect_accounts are
-- empty in the target environment (verified via inspect db table-stats).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop trigger + its function
DROP TRIGGER IF EXISTS on_payment_proposal_paid ON public.payment_proposals;
DROP FUNCTION IF EXISTS public.handle_payment_proposal_paid();

-- 2. Drop the fee-calc function (was: FLOOR(amount * 0.08))
DROP FUNCTION IF EXISTS public.calculate_mykonnect_fee(INTEGER);

-- 3. Drop the FK from chats before dropping payment_proposals
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_payment_proposal_fk;

-- 4. Drop the payment tables
DROP TABLE IF EXISTS public.payment_proposals;
DROP TABLE IF EXISTS public.stripe_connect_accounts;

-- 5. Remove payment columns added onto chats
ALTER TABLE public.chats
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_proposal_id,
  DROP COLUMN IF EXISTS total_paid_cents;

-- 6. Remove payment columns added onto chat_messages, and shrink the
--    message_type CHECK to only the surviving kinds.
ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS payment_proposal_id;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'system'));
