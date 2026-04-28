-- ─── 20250006_add_degree_matching.sql ───────────────────────────────────────
-- Adds server-side degree-of-separation matching.
--
-- Changes:
--   1. `shouts.trust_path` (jsonb)   — stores the hop path for each matched contact
--   2. `shouts.match_degree` (smallint) — degree of the best match (1..6)
--   3. fn `get_connections_at_degree(user_id, target_degree)` — recursive graph walk
--   4. fn `calculate_match_score(shout_id, candidate_id, degree, path)`
--   5. index `connections_graph_idx` on (requester_id, addressee_id, status)
--
-- The scoring formula in `calculate_match_score` is a MIRROR of
-- `src/lib/degreeMatching.ts → getTrustPathWeight`. Any change to one MUST be
-- replicated in the other — the two implementations are required to produce
-- the same score for the same inputs.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Columns on shouts ────────────────────────────────────────────────────
ALTER TABLE public.shouts
  ADD COLUMN IF NOT EXISTS trust_path   jsonb,
  ADD COLUMN IF NOT EXISTS match_degree smallint
    CHECK (match_degree IS NULL OR match_degree BETWEEN 1 AND 6);

-- ─── 2. Graph traversal index ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS connections_graph_idx
  ON public.connections(requester_id, addressee_id, status);

-- ─── 3. Recursive graph walk ─────────────────────────────────────────────────
-- Walks the connections graph from `start_user_id` up to `target_degree` levels
-- and returns each reachable profile with its shortest path and degree.
--
--   target_degree is clamped to 1..6.
--   Only `accepted` connections are traversed.
--   The starting user is excluded from the result set.
--   A user who is reachable at multiple degrees appears ONLY at the shortest
--   degree — no duplicates across layers.
--   The recursive CTE carries a `path` array that doubles as a visited-set,
--   which prevents cycles in the graph.
CREATE OR REPLACE FUNCTION public.get_connections_at_degree(
  start_user_id  uuid,
  target_degree  integer
)
RETURNS TABLE (
  profile_id uuid,
  path       uuid[],
  degree     integer
)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE walk AS (
    -- Seed: direct (1st-degree) connections
    SELECT
      CASE WHEN c.requester_id = start_user_id THEN c.addressee_id ELSE c.requester_id END AS profile_id,
      ARRAY[start_user_id,
            CASE WHEN c.requester_id = start_user_id THEN c.addressee_id ELSE c.requester_id END
      ] AS path,
      1 AS degree
    FROM public.connections c
    WHERE c.status = 'accepted'
      AND (c.requester_id = start_user_id OR c.addressee_id = start_user_id)

    UNION ALL

    -- Recurse: one hop outward from the frontier, guarding against cycles
    SELECT
      CASE WHEN c.requester_id = w.profile_id THEN c.addressee_id ELSE c.requester_id END AS profile_id,
      w.path || CASE WHEN c.requester_id = w.profile_id THEN c.addressee_id ELSE c.requester_id END,
      w.degree + 1
    FROM walk w
    JOIN public.connections c
      ON c.status = 'accepted'
     AND (c.requester_id = w.profile_id OR c.addressee_id = w.profile_id)
    WHERE w.degree < LEAST(GREATEST(target_degree, 1), 6)
      -- Cycle guard: never revisit a node already in the path
      AND NOT (CASE WHEN c.requester_id = w.profile_id THEN c.addressee_id ELSE c.requester_id END = ANY(w.path))
  )
  -- Deduplicate across degrees: keep each profile at the shortest path
  SELECT DISTINCT ON (profile_id)
    profile_id,
    path,
    degree
  FROM walk
  WHERE profile_id <> start_user_id
  ORDER BY profile_id, degree ASC;
$$;

COMMENT ON FUNCTION public.get_connections_at_degree IS
  'Recursive walk of the connections graph up to target_degree (max 6). '
  'Returns each reachable profile at its shortest degree, with the uuid path '
  'from the start user to that profile. Only accepted connections are traversed. '
  'The recursive CTE uses the path array as a visited-set to prevent cycles.';

-- ─── 4. Match scoring ────────────────────────────────────────────────────────
-- Calculates a composite match score between 0 and 1 for a given candidate
-- against a specific shout. The formula mirrors
-- src/lib/degreeMatching.ts → getTrustPathWeight exactly.
--
--   overlap_ratio = |shout.skill_tags ∩ candidate.skill_tags| / |shout.skill_tags|
--   degree_decay  = 0.85 ^ max(degree - 1, 0)
--   bridge_weight = product over bridge contacts of (bridge_trust_score / 100)
--                   (bridges = every uuid in path[] except the first (start_user)
--                    and the last (candidate) — i.e. the vouching intermediaries)
--   final_score   = overlap_ratio * degree_decay * bridge_weight
CREATE OR REPLACE FUNCTION public.calculate_match_score(
  shout_id      uuid,
  candidate_id  uuid,
  degree        integer,
  path          uuid[]
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  shout_tags        text[];
  candidate_tags    text[];
  overlap_count     integer;
  overlap_ratio     numeric;
  degree_decay      numeric;
  bridge_weight     numeric := 1.0;
  bridge_id         uuid;
  bridge_score      integer;
  final_score       numeric;
BEGIN
  -- Fetch shout + candidate skill tags
  SELECT s.skill_tags INTO shout_tags  FROM public.shouts   s WHERE s.id = shout_id;
  SELECT p.skill_tags INTO candidate_tags FROM public.profiles p WHERE p.id = candidate_id;

  IF shout_tags IS NULL OR candidate_tags IS NULL OR array_length(shout_tags, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Skill-tag overlap ratio (relative to the shout's requested skills)
  SELECT COUNT(*) INTO overlap_count
  FROM unnest(shout_tags)    AS t
  WHERE t = ANY(candidate_tags);

  overlap_ratio := overlap_count::numeric / GREATEST(array_length(shout_tags, 1), 1);

  -- Degree decay: one 0.85 multiplier per hop beyond the 1st degree
  degree_decay := power(0.85, GREATEST(degree - 1, 0));

  -- Bridge weight: product of (trust_score/100) for every intermediate hop.
  -- path[1]      = start user (the shout author)  — NOT a bridge
  -- path[last]   = candidate                      — NOT a bridge
  -- path[2..n-1] = the vouching intermediaries    — these ARE the bridges
  IF array_length(path, 1) >= 3 THEN
    FOR i IN 2 .. (array_length(path, 1) - 1) LOOP
      bridge_id := path[i];
      SELECT p.trust_score INTO bridge_score FROM public.profiles p WHERE p.id = bridge_id;
      IF bridge_score IS NULL THEN
        bridge_score := 50; -- conservative fallback
      END IF;
      bridge_weight := bridge_weight * (bridge_score::numeric / 100);
    END LOOP;
  END IF;

  final_score := overlap_ratio * degree_decay * bridge_weight;

  -- Clamp to [0, 1]
  IF final_score < 0 THEN final_score := 0; END IF;
  IF final_score > 1 THEN final_score := 1; END IF;

  RETURN final_score;
END;
$$;

COMMENT ON FUNCTION public.calculate_match_score IS
  'Composite score (0..1) for a candidate vs a shout at a given degree. '
  'Mirrors src/lib/degreeMatching.ts → getTrustPathWeight. Any change here '
  'MUST be replicated in the TypeScript helper — they must produce the same '
  'score for the same inputs.';
