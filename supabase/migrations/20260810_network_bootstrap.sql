-- ─── 20260810_network_bootstrap.sql ─────────────────────────────────────────
-- Bootstrap trust-graph density for beta:
--   1. Invite tree: every new profile gets a stable `invite_code`. When a new
--      user signs up carrying an inviter's code in raw_user_meta_data, the
--      trigger auto-creates an ACCEPTED connections row + awards +30 points
--      to the inviter. Friend-of-friend expansion then compounds through the
--      existing recursive walker in 20250006 with zero extra SQL.
--   2. Hashed contacts: on-device SHA-256 of normalized email/phone is
--      uploaded per user. `get_contact_bridged_users` returns other users who
--      share at least one hashed contact — those pairs are silently 2nd-degree
--      through a ghost node that never has to sign up.
--   3. `contacts_onboarded` flag lets the app know when to show the
--      contact-import onboarding screen (only on first sign-in).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Profile additions ───────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_code        text UNIQUE,
  ADD COLUMN IF NOT EXISTS invited_by_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contacts_onboarded boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_invite_code_idx ON public.profiles(invite_code);
CREATE INDEX IF NOT EXISTS profiles_invited_by_idx  ON public.profiles(invited_by_id);

-- Generator: 8-char uppercase base32-ish slug (no confusable chars).
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; -- excludes I, L, O, 0, 1, U
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill missing invite codes for existing rows, retrying on the rare collision.
DO $$
DECLARE
  row_rec record;
  new_code text;
BEGIN
  FOR row_rec IN SELECT id FROM public.profiles WHERE invite_code IS NULL LOOP
    LOOP
      new_code := public.generate_invite_code();
      BEGIN
        UPDATE public.profiles SET invite_code = new_code WHERE id = row_rec.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- try again
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- ─── 2. Hashed contacts table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hashed_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hash       text NOT NULL,
  hash_type  text NOT NULL CHECK (hash_type IN ('email','phone')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hash, hash_type)
);

CREATE INDEX IF NOT EXISTS hashed_contacts_hash_idx    ON public.hashed_contacts(hash, hash_type);
CREATE INDEX IF NOT EXISTS hashed_contacts_user_id_idx ON public.hashed_contacts(user_id);

ALTER TABLE public.hashed_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own hashed contacts"
  ON public.hashed_contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hashed contacts"
  ON public.hashed_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own hashed contacts"
  ON public.hashed_contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.hashed_contacts FROM anon;

-- ─── 3. Bridging RPC ────────────────────────────────────────────────────────
-- Returns other users who share at least one hashed contact with `start_user_id`,
-- plus how many ghost nodes are shared (bridge strength). SECURITY DEFINER so
-- the caller only ever sees the *aggregate* — never the raw hashes of other
-- users. Callers must be authenticated; the function refuses to run for anyone
-- other than the caller themself (defense in depth against a compromised
-- service role calling on behalf of a user).
CREATE OR REPLACE FUNCTION public.get_contact_bridged_users(start_user_id uuid)
RETURNS TABLE (profile_id uuid, shared_count int)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> start_user_id THEN
    RAISE EXCEPTION 'get_contact_bridged_users: caller must be the target user';
  END IF;

  RETURN QUERY
  SELECT other.user_id AS profile_id, COUNT(*)::int AS shared_count
  FROM public.hashed_contacts mine
  JOIN public.hashed_contacts other
    ON other.hash = mine.hash
   AND other.hash_type = mine.hash_type
   AND other.user_id <> mine.user_id
  WHERE mine.user_id = start_user_id
  GROUP BY other.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contact_bridged_users(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_contact_bridged_users(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_contact_bridged_users IS
  'Silent 2nd-degree bridge finder. Given a user, returns every other user who '
  'shares at least one hashed contact (ghost node). SECURITY DEFINER but self-only.';

-- ─── 4. Extend handle_new_user() ────────────────────────────────────────────
-- The original trigger just inserts a profiles row. We now also:
--   - assign a fresh invite_code (retrying on the rare unique collision)
--   - if raw_user_meta_data.invited_by_code is set, resolve it to an inviter,
--     write invited_by_id, create an ACCEPTED connections row, and credit the
--     inviter with +30 referral_completion points.
--
-- Note: we intentionally do NOT hard-fail signup on invite mis-linkage — the
-- user still gets an account even if the code was bogus.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code_input text;
  inviter_id        uuid;
  new_invite_code   text;
  inviter_new_bal   integer;
BEGIN
  invite_code_input := upper(nullif(trim(new.raw_user_meta_data->>'invited_by_code'), ''));

  -- Try to resolve the inviter code, if any.
  IF invite_code_input IS NOT NULL THEN
    SELECT id INTO inviter_id
    FROM public.profiles
    WHERE invite_code = invite_code_input
    LIMIT 1;
  END IF;

  -- Mint a unique invite code for the new profile.
  LOOP
    new_invite_code := public.generate_invite_code();
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, invite_code, invited_by_id)
      VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new_invite_code,
        inviter_id
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Retry on invite_code collision. If the collision is on the id/email
      -- unique constraint we'll bubble that up on the next iteration.
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
        CONTINUE;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP;

  -- Auto-connect inviter <-> invitee and credit points.
  IF inviter_id IS NOT NULL AND inviter_id <> new.id THEN
    INSERT INTO public.connections (requester_id, addressee_id, status, vouched_at)
    VALUES (inviter_id, new.id, 'accepted', now())
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;

    SELECT konnect_points + 30 INTO inviter_new_bal
    FROM public.profiles WHERE id = inviter_id;

    UPDATE public.profiles
      SET konnect_points = inviter_new_bal
    WHERE id = inviter_id;

    INSERT INTO public.points_ledger (user_id, event_type, delta, balance_after, reference_id, description)
    VALUES (
      inviter_id,
      'referral_completion',
      30,
      inviter_new_bal,
      new.id,
      'Referral bonus — invited member joined MyKonnect'
    );
  END IF;

  RETURN new;
END;
$$;
