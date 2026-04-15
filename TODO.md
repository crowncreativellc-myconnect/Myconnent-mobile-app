# MyConnect — Release TODO

## Phase 1 — Backend Setup
- [ ] Create Supabase project at supabase.com
- [ ] Run `supabase/schema.sql` to deploy database schema
- [ ] Configure Row Level Security (RLS) policies
- [ ] Create storage buckets: `avatars`, `voice-notes`
- [ ] Create `.env` file with:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY` (for Edge Function)
- [ ] Deploy `parse-shout` Edge Function to Supabase
- [ ] Wire up Realtime subscriptions in home feed

## Phase 2 — Missing Features
- [ ] Shout detail view (tap a card → full view + matched users)
- [ ] Settings screen (currently empty/hidden)
- [ ] Profile edit flow
- [ ] Basic push notifications (Expo + Supabase)
- [ ] Facebook OAuth (configure app, set redirect URIs)

## Phase 3 — Builds & Store Setup
- [ ] Configure EAS credentials
  - Apple Team ID
  - App Store Connect App ID
  - Google Play service account JSON
- [ ] iOS: Create App Store Connect listing
- [ ] iOS: Submit to TestFlight for beta testing
- [ ] Android: Create Play Store listing
- [ ] Android: Upload to internal testing track

## Phase 4 — QA & Launch
- [ ] TestFlight beta — internal testing
- [ ] Play Store internal → open testing
- [ ] Add error tracking (Sentry or similar)
- [ ] App Store review submission
- [ ] Play Store review submission
- [ ] Soft launch
