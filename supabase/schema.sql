-- ============================================================
-- MyConnect — Supabase Database Schema
-- Run this in your Supabase SQL Editor to bootstrap the DB.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";      -- for fast ILIKE search

-- ─── Enums ───────────────────────────────────────────────────
create type trust_tier as enum ('Member', 'Connector', 'Trusted', 'Founding');
create type user_status as enum ('active', 'inactive', 'suspended');
create type shout_urgency as enum ('routine', 'urgent', 'asap');
create type shout_complexity as enum ('simple_task', 'project', 'ongoing');
create type shout_format as enum ('in_person', 'remote', 'async');
create type shout_status as enum ('draft','parsing','matching','active','accepted','completed','cancelled');
create type connection_status as enum ('pending', 'accepted', 'declined');
create type points_event as enum (
  'completion','strong_review','referral_completion',
  'fast_response','streak_bonus','spend_priority_match','spend_second_degree'
);
create type notification_type as enum (
  'shout_match','shout_accepted','shout_completed','review_received',
  'connection_request','connection_accepted','points_earned','trust_tier_upgrade'
);

-- ─── Profiles ────────────────────────────────────────────────
create table profiles (
  id                        uuid primary key references auth.users on delete cascade,
  email                     text not null unique,
  full_name                 text not null,
  avatar_url                text,
  headline                  text,
  location                  text,
  bio                       text,
  skill_tags                text[] not null default '{}',
  trust_score               smallint not null default 0 check (trust_score between 0 and 100),
  trust_tier                trust_tier not null default 'Member',
  konnect_points            integer not null default 0 check (konnect_points >= 0),
  completion_rate           numeric(4,3) not null default 0 check (completion_rate between 0 and 1),
  response_time_median_hours numeric(6,2),
  total_completions         integer not null default 0,
  status                    user_status not null default 'active',
  is_premium                boolean not null default false,
  invite_code               text unique,
  invited_by_id             uuid references profiles(id) on delete set null,
  contacts_onboarded        boolean not null default false,
  joined_at                 timestamptz not null default now(),
  last_active_at            timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists profiles_invite_code_idx on profiles(invite_code);
create index if not exists profiles_invited_by_idx  on profiles(invited_by_id);

-- Index for fast Facebook friend cross-reference lookup

-- Invite-code generator: 8-char base32-ish (no confusable chars).
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  result   text := '';
  i        int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Trigger: auto-create profile on auth.users insert. Also mints an invite_code,
-- and if the caller passed raw_user_meta_data.invited_by_code, resolves the
-- inviter, auto-connects them, and credits +30 referral points.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_code_input text;
  inviter_id        uuid;
  new_invite_code   text;
  inviter_new_bal   integer;
begin
  invite_code_input := upper(nullif(trim(new.raw_user_meta_data->>'invited_by_code'), ''));

  if invite_code_input is not null then
    select id into inviter_id
    from public.profiles
    where invite_code = invite_code_input
    limit 1;
  end if;

  loop
    new_invite_code := public.generate_invite_code();
    begin
      insert into public.profiles (id, email, full_name, invite_code, invited_by_id)
      values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new_invite_code,
        inviter_id
      );
      exit;
    exception when unique_violation then
      if not exists (select 1 from public.profiles where id = new.id) then
        continue;
      else
        raise;
      end if;
    end;
  end loop;

  if inviter_id is not null and inviter_id <> new.id then
    insert into public.connections (requester_id, addressee_id, status, vouched_at)
    values (inviter_id, new.id, 'accepted', now())
    on conflict (requester_id, addressee_id) do nothing;

    select konnect_points + 30 into inviter_new_bal
    from public.profiles where id = inviter_id;

    update public.profiles
      set konnect_points = inviter_new_bal
    where id = inviter_id;

    insert into public.points_ledger (user_id, event_type, delta, balance_after, reference_id, description)
    values (
      inviter_id,
      'referral_completion',
      30,
      inviter_new_bal,
      new.id,
      'Referral bonus — invited member joined MyKonnect'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Connections ─────────────────────────────────────────────
create table connections (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        connection_status not null default 'pending',
  vouched_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint no_self_connect check (requester_id <> addressee_id),
  constraint unique_pair unique (requester_id, addressee_id)
);

create index connections_addressee_idx on connections(addressee_id);
create index connections_status_idx on connections(status);

-- ─── Shouts ──────────────────────────────────────────────────
create table shouts (
  id                uuid primary key default uuid_generate_v4(),
  author_id         uuid not null references profiles(id) on delete cascade,
  raw_text          text,
  voice_url         text,
  draft_text        text not null,
  skill_tags        text[] not null default '{}',
  urgency           shout_urgency not null default 'routine',
  complexity        shout_complexity not null default 'simple_task',
  format            shout_format not null default 'async',
  ai_confidence     numeric(4,3) check (ai_confidence between 0 and 1),
  status            shout_status not null default 'active',
  matched_user_ids  uuid[] not null default '{}',
  accepted_by_id    uuid references profiles(id),
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index shouts_author_idx on shouts(author_id);
create index shouts_status_idx on shouts(status);
create index shouts_created_idx on shouts(created_at desc);

-- ─── Reviews ─────────────────────────────────────────────────
create table reviews (
  id                uuid primary key default uuid_generate_v4(),
  shout_id          uuid not null references shouts(id) on delete cascade,
  reviewer_id       uuid not null references profiles(id) on delete cascade,
  reviewee_id       uuid not null references profiles(id) on delete cascade,
  rating            smallint not null check (rating between 1 and 5),
  body              text,
  is_verified       boolean not null default false,
  ai_quality_score  numeric(4,3) check (ai_quality_score between 0 and 1),
  created_at        timestamptz not null default now(),
  constraint one_review_per_shout unique (shout_id, reviewer_id)
);

create index reviews_reviewee_idx on reviews(reviewee_id);

-- ─── Points Ledger ───────────────────────────────────────────
create table points_ledger (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  event_type     points_event not null,
  delta          integer not null,
  balance_after  integer not null,
  reference_id   uuid,
  description    text not null,
  created_at     timestamptz not null default now()
);

create index points_user_idx on points_ledger(user_id);
create index points_created_idx on points_ledger(created_at desc);

-- ─── Notifications ────────────────────────────────────────────
create table notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  type          notification_type not null,
  title         text not null,
  body          text not null,
  reference_id  uuid,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications(user_id, is_read) where is_read = false;

-- ─── Row Level Security ──────────────────────────────────────
alter table profiles     enable row level security;
alter table connections  enable row level security;
alter table shouts       enable row level security;
alter table reviews      enable row level security;
alter table points_ledger enable row level security;
alter table notifications enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "Profiles are publicly readable"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Connections: users see their own connections
create policy "Users see own connections"
  on connections for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users create connections"
  on connections for insert with check (auth.uid() = requester_id);
create policy "Addressee can update status"
  on connections for update using (auth.uid() = addressee_id);

-- Shouts: visible to author + matched users + connections of author
create policy "Shout authors see own shouts"
  on shouts for select using (auth.uid() = author_id);
create policy "Matched users see shout"
  on shouts for select using (auth.uid() = any(matched_user_ids));
create policy "Authors create shouts"
  on shouts for insert with check (auth.uid() = author_id);
create policy "Authors update own shouts"
  on shouts for update using (auth.uid() = author_id);

-- Reviews: reviewee and reviewer see review
create policy "Review parties see review"
  on reviews for select using (auth.uid() = reviewer_id or auth.uid() = reviewee_id);
create policy "Reviewer creates review"
  on reviews for insert with check (auth.uid() = reviewer_id);

-- Points: users see own ledger
create policy "Users see own points"
  on points_ledger for select using (auth.uid() = user_id);

-- Notifications: users see own notifications
create policy "Users see own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "Users mark notifications read"
  on notifications for update using (auth.uid() = user_id);

-- ─── Storage Buckets ─────────────────────────────────────────
-- Run in Supabase Dashboard > Storage > New Bucket
-- Or via API:
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', false);

-- ─── Connection Approvals ─────────────────────────────────────
alter type points_event add value if not exists 'feedback_completion';
alter type points_event add value if not exists 'feedback_bonus';

create table connection_approvals (
  id                    uuid primary key default uuid_generate_v4(),
  shout_id              uuid not null references shouts(id) on delete cascade,
  requester_id          uuid not null references profiles(id) on delete cascade,
  matched_user_id       uuid not null references profiles(id) on delete cascade,
  requester_approved    boolean not null default false,
  matched_user_approved boolean not null default false,
  both_approved         boolean generated always as (requester_approved and matched_user_approved) stored,
  approved_at           timestamptz,
  contact_card_exchanged boolean not null default false,
  created_at            timestamptz not null default now(),
  constraint unique_approval_per_shout unique (shout_id)
);

create index approvals_requester_idx on connection_approvals(requester_id);
create index approvals_matched_idx   on connection_approvals(matched_user_id);

-- ─── Feedback Messages ────────────────────────────────────────
create table feedback_messages (
  id                uuid primary key default uuid_generate_v4(),
  shout_id          uuid not null references shouts(id) on delete cascade,
  sender_id         uuid references profiles(id) on delete set null,
  body              text not null,
  is_system_message boolean not null default false,
  created_at        timestamptz not null default now()
);

create index feedback_messages_shout_idx   on feedback_messages(shout_id);
create index feedback_messages_created_idx on feedback_messages(created_at desc);

-- ─── Feedback Channels ───────────────────────────────────────
create table feedback_channels (
  id              uuid primary key default uuid_generate_v4(),
  shout_id        uuid not null unique references shouts(id) on delete cascade,
  participant_ids uuid[] not null,
  is_active       boolean not null default true,
  points_awarded  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index feedback_channels_shout_idx on feedback_channels(shout_id);

-- RLS
alter table connection_approvals enable row level security;
alter table feedback_messages    enable row level security;
alter table feedback_channels    enable row level security;

create policy "Approval participants can read"
  on connection_approvals for select
  using (auth.uid() = requester_id or auth.uid() = matched_user_id);
create policy "Approval participants can update"
  on connection_approvals for update
  using (auth.uid() = requester_id or auth.uid() = matched_user_id);
create policy "Approval participants can insert"
  on connection_approvals for insert
  with check (auth.uid() = requester_id);

create policy "Feedback message participants can read"
  on feedback_messages for select
  using (
    exists (
      select 1 from connection_approvals ca
      where ca.shout_id = feedback_messages.shout_id
        and (auth.uid() = ca.requester_id or auth.uid() = ca.matched_user_id)
    )
  );
create policy "Feedback message participants can insert"
  on feedback_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from connection_approvals ca
      where ca.shout_id = feedback_messages.shout_id
        and (auth.uid() = ca.requester_id or auth.uid() = ca.matched_user_id)
        and ca.both_approved = true
    )
  );

create policy "Feedback channel participants can read"
  on feedback_channels for select
  using (auth.uid() = any(participant_ids));
create policy "Feedback channel participants can update"
  on feedback_channels for update
  using (auth.uid() = any(participant_ids));
create policy "Feedback channel participants can insert"
  on feedback_channels for insert
  with check (auth.uid() = any(participant_ids));

-- Trigger: set approved_at + insert system message when both approve
create or replace function public.handle_approval_complete()
returns trigger language plpgsql security definer as $$
begin
  if new.requester_approved = true and new.matched_user_approved = true
     and not (old.requester_approved = true and old.matched_user_approved = true)
  then
    new.approved_at = now();
    insert into public.feedback_messages (shout_id, sender_id, body, is_system_message)
    values (
      new.shout_id,
      null,
      'Connection approved — contact cards have been exchanged. You can now communicate privately.',
      true
    );
  end if;
  return new;
end;
$$;

create trigger on_approval_complete
  before update on public.connection_approvals
  for each row execute function public.handle_approval_complete();

-- ─── Hashed Contacts (silent 2nd-degree bridging) ────────────────────────────
create table if not exists hashed_contacts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  hash       text not null,
  hash_type  text not null check (hash_type in ('email','phone')),
  created_at timestamptz not null default now(),
  unique (user_id, hash, hash_type)
);

create index if not exists hashed_contacts_hash_idx    on hashed_contacts(hash, hash_type);
create index if not exists hashed_contacts_user_id_idx on hashed_contacts(user_id);

alter table hashed_contacts enable row level security;

create policy "Users read own hashed contacts"
  on hashed_contacts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own hashed contacts"
  on hashed_contacts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own hashed contacts"
  on hashed_contacts for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on hashed_contacts from anon;

-- Silent 2nd-degree bridge finder: returns other users who share at least one
-- hashed contact with the caller. SECURITY DEFINER but self-only, so callers
-- never see the raw hashes of other users — only aggregate counts.
create or replace function public.get_contact_bridged_users(start_user_id uuid)
returns table (profile_id uuid, shared_count int)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> start_user_id then
    raise exception 'get_contact_bridged_users: caller must be the target user';
  end if;

  return query
  select other.user_id as profile_id, count(*)::int as shared_count
  from public.hashed_contacts mine
  join public.hashed_contacts other
    on other.hash = mine.hash
   and other.hash_type = mine.hash_type
   and other.user_id <> mine.user_id
  where mine.user_id = start_user_id
  group by other.user_id;
end;
$$;

revoke all on function public.get_contact_bridged_users(uuid) from public;
grant execute on function public.get_contact_bridged_users(uuid) to authenticated;
