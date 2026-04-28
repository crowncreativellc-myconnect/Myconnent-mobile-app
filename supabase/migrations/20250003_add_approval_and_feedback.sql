-- ============================================================
-- MyConnect — Connection Approval & Feedback Channel
-- ============================================================

-- ─── New points_event enum values ────────────────────────────
ALTER TYPE points_event ADD VALUE IF NOT EXISTS 'feedback_completion';
ALTER TYPE points_event ADD VALUE IF NOT EXISTS 'feedback_bonus';

-- ─── connection_approvals ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connection_approvals (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id              uuid NOT NULL REFERENCES public.shouts(id) ON DELETE CASCADE,
  requester_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_approved    boolean NOT NULL DEFAULT false,
  matched_user_approved boolean NOT NULL DEFAULT false,
  both_approved         boolean GENERATED ALWAYS AS (requester_approved AND matched_user_approved) STORED,
  approved_at           timestamptz,
  contact_card_exchanged boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_approval_per_shout UNIQUE (shout_id)
);

CREATE INDEX IF NOT EXISTS approvals_requester_idx ON public.connection_approvals(requester_id);
CREATE INDEX IF NOT EXISTS approvals_matched_idx   ON public.connection_approvals(matched_user_id);

-- ─── feedback_messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id         uuid NOT NULL REFERENCES public.shouts(id) ON DELETE CASCADE,
  sender_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body             text NOT NULL,
  is_system_message boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_messages_shout_idx   ON public.feedback_messages(shout_id);
CREATE INDEX IF NOT EXISTS feedback_messages_created_idx ON public.feedback_messages(created_at DESC);

-- ─── feedback_channels ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_channels (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id         uuid NOT NULL UNIQUE REFERENCES public.shouts(id) ON DELETE CASCADE,
  participant_ids  uuid[] NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  points_awarded   boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_channels_shout_idx ON public.feedback_channels(shout_id);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE public.connection_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_channels    ENABLE ROW LEVEL SECURITY;

-- connection_approvals: only the two parties can read/write
CREATE POLICY "Approval participants can read"
  ON public.connection_approvals FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = matched_user_id);

CREATE POLICY "Approval participants can update"
  ON public.connection_approvals FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = matched_user_id);

CREATE POLICY "Approval participants can insert"
  ON public.connection_approvals FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- feedback_messages: only participants of the related approval can read/write
CREATE POLICY "Feedback message participants can read"
  ON public.feedback_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connection_approvals ca
      WHERE ca.shout_id = feedback_messages.shout_id
        AND (auth.uid() = ca.requester_id OR auth.uid() = ca.matched_user_id)
    )
  );

CREATE POLICY "Feedback message participants can insert"
  ON public.feedback_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.connection_approvals ca
      WHERE ca.shout_id = feedback_messages.shout_id
        AND (auth.uid() = ca.requester_id OR auth.uid() = ca.matched_user_id)
        AND ca.both_approved = true
    )
  );

-- feedback_channels: only participants can read/write
CREATE POLICY "Feedback channel participants can read"
  ON public.feedback_channels FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Feedback channel participants can update"
  ON public.feedback_channels FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Feedback channel participants can insert"
  ON public.feedback_channels FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- ─── Trigger: set approved_at + system message on both_approved ───
CREATE OR REPLACE FUNCTION public.handle_approval_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Fire only when both flags just became true
  IF NEW.requester_approved = true AND NEW.matched_user_approved = true
     AND NOT (OLD.requester_approved = true AND OLD.matched_user_approved = true)
  THEN
    NEW.approved_at = NOW();

    INSERT INTO public.feedback_messages (shout_id, sender_id, body, is_system_message)
    VALUES (
      NEW.shout_id,
      NULL,
      'Connection approved — contact cards have been exchanged. You can now communicate privately.',
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_approval_complete
  BEFORE UPDATE ON public.connection_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_approval_complete();
