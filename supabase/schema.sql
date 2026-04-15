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
  joined_at                 timestamptz not null default now(),
  last_active_at            timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Index for fast Facebook friend cross-reference lookup

-- Trigger: auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
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
