-- Add expo_push_token to profiles so we can send push notifications.
-- Run this in Supabase SQL Editor.

alter table profiles
  add column if not exists expo_push_token text;
