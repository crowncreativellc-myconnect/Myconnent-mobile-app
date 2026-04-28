-- ─────────────────────────────────────────────────────────────────────────────
-- MyConnect — Test Network Seed
-- Tests 2nd through 6th degree trust matching
--
-- HOW TO USE:
--   1. Go to Supabase → SQL Editor
--   2. Replace 'YOUR-USER-ID-HERE' below with your actual user ID
--      (find it in Supabase → Authentication → Users → your row → copy the UUID)
--   3. Paste and run the whole script
--   4. Reload the app — the feed should show shouts with degree labels
--
-- TO CLEAN UP (remove all test data):
--   Run the DELETE block at the bottom of this file
-- ─────────────────────────────────────────────────────────────────────────────

-- Bypass FK constraints so we can create profiles without auth.users rows
SET session_replication_role = replica;

DO $$
DECLARE
  -- !! REPLACE THIS with your real user ID from Supabase Auth dashboard !!
  my_user_id   uuid := 'YOUR-USER-ID-HERE';

  -- Fixed UUIDs so cleanup is reliable
  alex_id      uuid := '11111111-test-test-test-000000000001';
  blake_id     uuid := '11111111-test-test-test-000000000002';
  casey_id     uuid := '11111111-test-test-test-000000000003';
  drew_id      uuid := '11111111-test-test-test-000000000004';
  ellis_id     uuid := '11111111-test-test-test-000000000005';
  frankie_id   uuid := '11111111-test-test-test-000000000006';
  outsider_id  uuid := '11111111-test-test-test-000000000007';

BEGIN

  -- ── Profiles ────────────────────────────────────────────────────────────────

  INSERT INTO profiles (
    id, email, full_name, avatar_url, headline, location, bio,
    skill_tags, trust_score, trust_tier, konnect_points,
    completion_rate, response_time_median_hours, total_completions,
    status, is_premium, joined_at, last_active_at
  ) VALUES

  -- 1st degree from you
  (alex_id, 'alex.test@myconnect.app', 'Alex Rivera', null,
   'Venture Partner · Early Stage', 'Boston, MA',
   'Connecting founders with capital since 2018.',
   ARRAY['fundraising','pitch_deck','investor_relations','startup_strategy'],
   82, 'Trusted', 460, 0.93, 1.8, 19,
   'active', true, now() - interval '14 months', now()),

  -- 2nd degree: alex → blake
  (blake_id, 'blake.test@myconnect.app', 'Blake Nguyen', null,
   'Senior React Native Engineer', 'Remote',
   'Building fast, polished mobile apps. Open to freelance sprints.',
   ARRAY['react_native','typescript','mobile_development','expo','graphql'],
   74, 'Connector', 290, 0.88, 3.2, 12,
   'active', false, now() - interval '10 months', now()),

  -- 3rd degree: alex → blake → casey
  (casey_id, 'casey.test@myconnect.app', 'Casey Okafor', null,
   'Corporate Attorney · Tech & Startups', 'NYC',
   'NDA drafting, term sheets, equity agreements — fast turnaround.',
   ARRAY['contract_law','nda','legal_review','term_sheets','equity_agreements'],
   88, 'Trusted', 510, 0.95, 2.1, 27,
   'active', true, now() - interval '20 months', now()),

  -- 4th degree: alex → blake → casey → drew
  (drew_id, 'drew.test@myconnect.app', 'Drew Castillo', null,
   'Lead UX Designer · B2B SaaS', 'Austin, TX',
   'Research-led design. I ship things people actually enjoy using.',
   ARRAY['ux_design','figma','product_design','user_research','design_systems'],
   69, 'Connector', 195, 0.85, 4.0, 9,
   'active', false, now() - interval '8 months', now()),

  -- 5th degree: ... → drew → ellis
  (ellis_id, 'ellis.test@myconnect.app', 'Ellis Park', null,
   'Data Scientist · ML & Analytics', 'San Francisco, CA',
   'Turning messy data into decisions. Python, SQL, and a lot of coffee.',
   ARRAY['data_science','python','machine_learning','sql','analytics'],
   77, 'Trusted', 380, 0.91, 2.5, 16,
   'active', false, now() - interval '18 months', now()),

  -- 6th degree: ... → ellis → frankie
  (frankie_id, 'frankie.test@myconnect.app', 'Frankie Delano', null,
   'Real Estate Attorney · Commercial', 'Chicago, IL',
   'Commercial leases, acquisitions, and zoning disputes.',
   ARRAY['real_estate_law','commercial_leasing','property_law','zoning','acquisitions'],
   71, 'Connector', 220, 0.87, 3.8, 11,
   'active', false, now() - interval '12 months', now()),

  -- Outsider — posts all the test shouts (not connected to anyone)
  (outsider_id, 'outsider.test@myconnect.app', 'Jordan Mills', null,
   'Founder · StealthCo', 'Remote',
   'Building something new. Always looking for the right people.',
   ARRAY['entrepreneurship','b2b'],
   55, 'Member', 80, 0.70, 6.0, 3,
   'active', false, now() - interval '3 months', now())

  ON CONFLICT (id) DO NOTHING;


  -- ── Connections (the 6-degree chain) ────────────────────────────────────────
  -- YOU → Alex (1st)
  -- Alex → Blake (2nd from you)
  -- Blake → Casey (3rd)
  -- Casey → Drew (4th)
  -- Drew → Ellis (5th)
  -- Ellis → Frankie (6th)

  INSERT INTO connections (
    id, requester_id, addressee_id, status, vouched_at, created_at
  ) VALUES
  (gen_random_uuid(), my_user_id,  alex_id,    'accepted', now() - interval '12 months', now() - interval '12 months'),
  (gen_random_uuid(), alex_id,     blake_id,   'accepted', now() - interval '9 months',  now() - interval '9 months'),
  (gen_random_uuid(), blake_id,    casey_id,   'accepted', now() - interval '7 months',  now() - interval '7 months'),
  (gen_random_uuid(), casey_id,    drew_id,    'accepted', now() - interval '5 months',  now() - interval '5 months'),
  (gen_random_uuid(), drew_id,     ellis_id,   'accepted', now() - interval '4 months',  now() - interval '4 months'),
  (gen_random_uuid(), ellis_id,    frankie_id, 'accepted', now() - interval '2 months',  now() - interval '2 months')

  ON CONFLICT DO NOTHING;


  -- ── Shouts (posted by outsider, skills match each degree level) ─────────────

  INSERT INTO shouts (
    id, author_id, raw_text, voice_url, draft_text,
    skill_tags, urgency, complexity, format,
    ai_confidence, status, matched_user_ids,
    accepted_by_id, completed_at, cancelled_at, created_at, updated_at
  ) VALUES

  -- Matches Blake at 2nd degree
  ('22222222-test-test-test-000000000001',
   outsider_id,
   'Need a React Native developer for a fintech MVP sprint',
   null,
   'Looking for a senior React Native developer for a 2-week fintech MVP sprint. TypeScript required, Expo preferred. Remote OK.',
   ARRAY['react_native','typescript','mobile_development','expo'],
   'urgent', 'project', 'remote',
   0.92, 'active', ARRAY[]::uuid[],
   null, null, null, now() - interval '30 minutes', now()),

  -- Matches Casey at 3rd degree
  ('22222222-test-test-test-000000000002',
   outsider_id,
   'Need a contract lawyer to review an NDA this week',
   null,
   'Need a corporate attorney to review and redline an NDA for a B2B partnership — quick turnaround, ideally within 48 hours.',
   ARRAY['contract_law','nda','legal_review'],
   'urgent', 'simple_task', 'async',
   0.95, 'active', ARRAY[]::uuid[],
   null, null, null, now() - interval '1 hour', now()),

  -- Matches Drew at 4th degree
  ('22222222-test-test-test-000000000003',
   outsider_id,
   'Looking for a UX designer for a SaaS product redesign',
   null,
   'Looking for a UX designer to lead a full redesign of our B2B SaaS dashboard. Figma-native, research-first approach preferred.',
   ARRAY['ux_design','figma','product_design','user_research'],
   'routine', 'project', 'remote',
   0.88, 'active', ARRAY[]::uuid[],
   null, null, null, now() - interval '3 hours', now()),

  -- Matches Ellis at 5th degree
  ('22222222-test-test-test-000000000004',
   outsider_id,
   'Need a data scientist to build a churn prediction model',
   null,
   'Need an experienced data scientist to build a customer churn prediction model. Python / SQL stack, our data lives in BigQuery.',
   ARRAY['data_science','python','machine_learning','analytics'],
   'routine', 'project', 'async',
   0.87, 'active', ARRAY[]::uuid[],
   null, null, null, now() - interval '5 hours', now()),

  -- Matches Frankie at 6th degree
  ('22222222-test-test-test-000000000005',
   outsider_id,
   'Need a real estate attorney for a commercial lease negotiation',
   null,
   'Negotiating a 5-year commercial lease for a 4,000 sq ft office space in Chicago. Need an attorney experienced in commercial leasing and zoning.',
   ARRAY['real_estate_law','commercial_leasing','property_law'],
   'routine', 'simple_task', 'in_person',
   0.91, 'active', ARRAY[]::uuid[],
   null, null, null, now() - interval '8 hours', now())

  ON CONFLICT (id) DO NOTHING;

END $$;

-- Restore FK enforcement
SET session_replication_role = DEFAULT;


-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — run this block separately to remove all test data
-- ─────────────────────────────────────────────────────────────────────────────
/*
DELETE FROM shouts
  WHERE id::text LIKE '22222222-test-test-test%';

DELETE FROM connections
  WHERE requester_id::text LIKE '11111111-test-test-test%'
     OR addressee_id::text LIKE '11111111-test-test-test%'
     OR requester_id = 'YOUR-USER-ID-HERE'::uuid AND addressee_id::text LIKE '11111111-test-test-test%';

DELETE FROM profiles
  WHERE id::text LIKE '11111111-test-test-test%';
*/
