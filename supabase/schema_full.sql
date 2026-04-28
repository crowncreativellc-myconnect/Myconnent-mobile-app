-- ============================================================
-- MyConnect — Complete Database Schema
-- Fully idempotent: safe to run on a fresh DB or re-run on
-- an existing one without errors.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enums ───────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE trust_tier AS ENUM ('Member','Connector','Trusted','Founding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shout_urgency AS ENUM ('routine','urgent','asap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shout_complexity AS ENUM ('simple_task','project','ongoing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shout_format AS ENUM ('in_person','remote','async');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shout_status AS ENUM ('draft','parsing','matching','active','accepted','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE connection_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE points_event AS ENUM (
  'completion','strong_review','referral_completion',
  'fast_response','streak_bonus','spend_priority_match','spend_second_degree',
  'feedback_completion','feedback_bonus'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new enum values if they don't already exist
ALTER TYPE points_event ADD VALUE IF NOT EXISTS 'feedback_completion';
ALTER TYPE points_event ADD VALUE IF NOT EXISTS 'feedback_bonus';

DO $$ BEGIN CREATE TYPE notification_type AS ENUM (
  'shout_match','shout_accepted','shout_completed','review_received',
  'connection_request','connection_accepted','points_earned','trust_tier_upgrade'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email                      text NOT NULL UNIQUE,
  full_name                  text NOT NULL,
  avatar_url                 text,
  headline                   text,
  location                   text,
  bio                        text,
  skill_tags                 text[] NOT NULL DEFAULT '{}',
  trust_score                smallint NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  trust_tier                 trust_tier NOT NULL DEFAULT 'Member',
  konnect_points             integer NOT NULL DEFAULT 0 CHECK (konnect_points >= 0),
  completion_rate            numeric(4,3) NOT NULL DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 1),
  response_time_median_hours numeric(6,2),
  total_completions          integer NOT NULL DEFAULT 0,
  status                     user_status NOT NULL DEFAULT 'active',
  is_premium                 boolean NOT NULL DEFAULT false,
  expo_push_token            text,
  joined_at                  timestamptz NOT NULL DEFAULT now(),
  last_active_at             timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- Trigger: auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Connections ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connections (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        connection_status NOT NULL DEFAULT 'pending',
  vouched_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_connect CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS connections_addressee_idx ON public.connections(addressee_id);
CREATE INDEX IF NOT EXISTS connections_status_idx    ON public.connections(status);

-- ─── Shouts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shouts (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_text          text,
  voice_url         text,
  draft_text        text NOT NULL,
  skill_tags        text[] NOT NULL DEFAULT '{}',
  urgency           shout_urgency NOT NULL DEFAULT 'routine',
  complexity        shout_complexity NOT NULL DEFAULT 'simple_task',
  format            shout_format NOT NULL DEFAULT 'async',
  ai_confidence     numeric(4,3) CHECK (ai_confidence BETWEEN 0 AND 1),
  status            shout_status NOT NULL DEFAULT 'active',
  matched_user_ids  uuid[] NOT NULL DEFAULT '{}',
  accepted_by_id    uuid REFERENCES public.profiles(id),
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shouts_author_idx  ON public.shouts(author_id);
CREATE INDEX IF NOT EXISTS shouts_status_idx  ON public.shouts(status);
CREATE INDEX IF NOT EXISTS shouts_created_idx ON public.shouts(created_at DESC);

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id         uuid NOT NULL REFERENCES public.shouts(id) ON DELETE CASCADE,
  reviewer_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating           smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body             text,
  is_verified      boolean NOT NULL DEFAULT false,
  ai_quality_score numeric(4,3) CHECK (ai_quality_score BETWEEN 0 AND 1),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_review_per_shout UNIQUE (shout_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews(reviewee_id);

-- ─── Points Ledger ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type    points_event NOT NULL,
  delta         integer NOT NULL,
  balance_after integer NOT NULL,
  reference_id  uuid,
  description   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_user_idx    ON public.points_ledger(user_id);
CREATE INDEX IF NOT EXISTS points_created_idx ON public.points_ledger(created_at DESC);

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  reference_id uuid,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, is_read) WHERE is_read = false;

-- ─── Connection Approvals ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connection_approvals (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id               uuid NOT NULL REFERENCES public.shouts(id) ON DELETE CASCADE,
  requester_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_approved     boolean NOT NULL DEFAULT false,
  matched_user_approved  boolean NOT NULL DEFAULT false,
  both_approved          boolean GENERATED ALWAYS AS (requester_approved AND matched_user_approved) STORED,
  approved_at            timestamptz,
  contact_card_exchanged boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_approval_per_shout UNIQUE (shout_id)
);

CREATE INDEX IF NOT EXISTS approvals_requester_idx ON public.connection_approvals(requester_id);
CREATE INDEX IF NOT EXISTS approvals_matched_idx   ON public.connection_approvals(matched_user_id);

-- ─── Feedback Messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id          uuid NOT NULL REFERENCES public.shouts(id) ON DELETE CASCADE,
  sender_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body              text NOT NULL,
  is_system_message boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_messages_shout_idx   ON public.feedback_messages(shout_id);
CREATE INDEX IF NOT EXISTS feedback_messages_created_idx ON public.feedback_messages(created_at DESC);

-- ─── Feedback Channels ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_channels (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shout_id        uuid NOT NULL UNIQUE REFERENCES public.shouts(id) ON DELETE CASCADE,
  participant_ids uuid[] NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  points_awarded  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_channels_shout_idx ON public.feedback_channels(shout_id);

-- ─── Row Level Security — enable ─────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shouts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_channels    ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies — profiles ─────────────────────────────────
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── RLS Policies — connections ──────────────────────────────
DROP POLICY IF EXISTS "Users see own connections" ON public.connections;
CREATE POLICY "Users see own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users create connections" ON public.connections;
CREATE POLICY "Users create connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Addressee can update status" ON public.connections;
CREATE POLICY "Addressee can update status"
  ON public.connections FOR UPDATE USING (auth.uid() = addressee_id);

-- ─── RLS Policies — shouts ───────────────────────────────────
DROP POLICY IF EXISTS "Shout authors see own shouts" ON public.shouts;
CREATE POLICY "Shout authors see own shouts"
  ON public.shouts FOR SELECT USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Matched users see shout" ON public.shouts;
CREATE POLICY "Matched users see shout"
  ON public.shouts FOR SELECT USING (auth.uid() = ANY(matched_user_ids));

DROP POLICY IF EXISTS "Authors create shouts" ON public.shouts;
CREATE POLICY "Authors create shouts"
  ON public.shouts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors update own shouts" ON public.shouts;
CREATE POLICY "Authors update own shouts"
  ON public.shouts FOR UPDATE USING (auth.uid() = author_id);

-- ─── RLS Policies — reviews ──────────────────────────────────
DROP POLICY IF EXISTS "Review parties see review" ON public.reviews;
CREATE POLICY "Review parties see review"
  ON public.reviews FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

DROP POLICY IF EXISTS "Reviewer creates review" ON public.reviews;
CREATE POLICY "Reviewer creates review"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ─── RLS Policies — points_ledger ────────────────────────────
DROP POLICY IF EXISTS "Users see own points" ON public.points_ledger;
CREATE POLICY "Users see own points"
  ON public.points_ledger FOR SELECT USING (auth.uid() = user_id);

-- ─── RLS Policies — notifications ────────────────────────────
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mark notifications read" ON public.notifications;
CREATE POLICY "Users mark notifications read"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ─── RLS Policies — connection_approvals ─────────────────────
DROP POLICY IF EXISTS "Approval participants can read" ON public.connection_approvals;
CREATE POLICY "Approval participants can read"
  ON public.connection_approvals FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = matched_user_id);

DROP POLICY IF EXISTS "Approval participants can update" ON public.connection_approvals;
CREATE POLICY "Approval participants can update"
  ON public.connection_approvals FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = matched_user_id);

DROP POLICY IF EXISTS "Approval participants can insert" ON public.connection_approvals;
CREATE POLICY "Approval participants can insert"
  ON public.connection_approvals FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- ─── RLS Policies — feedback_messages ────────────────────────
DROP POLICY IF EXISTS "Feedback message participants can read" ON public.feedback_messages;
CREATE POLICY "Feedback message participants can read"
  ON public.feedback_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.connection_approvals ca
      WHERE ca.shout_id = feedback_messages.shout_id
        AND (auth.uid() = ca.requester_id OR auth.uid() = ca.matched_user_id)
    )
  );

DROP POLICY IF EXISTS "Feedback message participants can insert" ON public.feedback_messages;
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

-- ─── RLS Policies — feedback_channels ────────────────────────
DROP POLICY IF EXISTS "Feedback channel participants can read" ON public.feedback_channels;
CREATE POLICY "Feedback channel participants can read"
  ON public.feedback_channels FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Feedback channel participants can update" ON public.feedback_channels;
CREATE POLICY "Feedback channel participants can update"
  ON public.feedback_channels FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Feedback channel participants can insert" ON public.feedback_channels;
CREATE POLICY "Feedback channel participants can insert"
  ON public.feedback_channels FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- ─── Trigger — approval complete ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_approval_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_approval_complete ON public.connection_approvals;
CREATE TRIGGER on_approval_complete
  BEFORE UPDATE ON public.connection_approvals
  FOR EACH ROW EXECUTE FUNCTION public.handle_approval_complete();

-- ─── Storage — avatars bucket ────────────────────────────────
-- 256×256 px JPEG @ 70% quality (~15–30 KB per upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

-- Anyone can read (required for public avatar URLs to render)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users may only write to their own folder: {user_id}/avatar.jpg
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Storage — voice-notes bucket ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;
