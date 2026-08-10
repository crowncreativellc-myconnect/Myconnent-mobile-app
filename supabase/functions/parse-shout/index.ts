// supabase/functions/parse-shout/index.ts
// Deploy with: supabase functions deploy parse-shout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─── Feature flags (mirrored from src/constants/featureFlags.ts) ──────────────
// IMPORTANT: keep these in sync with the client-side flags. Flipping a flag
// here is what actually unlocks deeper matching in production.
const FEATURE_FLAGS = {
  DEGREE_3_4_MATCHING: false,
  DEGREE_5_6_MATCHING: false,
} as const;

// Degree-1 score threshold: if the top 1st-degree match clears this bar, we
// stop and return. Otherwise we expand to degree 2 (and further if premium).
const STOP_EXPANSION_THRESHOLD = 0.65;

// ─── Types ───────────────────────────────────────────────────────────────────
type MatchDegree = 1 | 2 | 3 | 4 | 5 | 6;

interface ParseRequest {
  raw_text: string;
  author_id?: string;       // when provided, we also run the match phase
  subscription_tier?: 'free' | 'premium' | 'corporate';
}

interface TrustPathHop {
  user_id: string;
  full_name: string;
  trust_tier: 'Member' | 'Connector' | 'Trusted' | 'Founding';
  trust_score: number;
  avatar_url: string | null;
  degree: MatchDegree;
}

interface MatchPreview {
  matched_user_id: string;
  degree: MatchDegree;
  trust_path: TrustPathHop[];
  final_score: number;
  skill_overlap: string[];
  // Set when the match is bridged silently via shared hashed contacts rather
  // than a walkable connections path. The client renders "N shared contacts"
  // instead of a member name for the bridge hop.
  ghost_bridge_count?: number;
}

interface ParseResponse {
  skill_tags: string[];
  urgency: 'routine' | 'urgent' | 'asap';
  complexity: 'simple_task' | 'project' | 'ongoing';
  format: 'in_person' | 'remote' | 'async';
  draft_text: string;
  confidence: number;
  matches?: MatchPreview[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Max-degree resolver (mirrors getMaxDegreeForUser) ────────────────────────
function getMaxDegreeForUser(tier: 'free' | 'premium' | 'corporate'): MatchDegree {
  if (tier === 'corporate' && FEATURE_FLAGS.DEGREE_5_6_MATCHING) return 6;
  if ((tier === 'corporate' || tier === 'premium') && FEATURE_FLAGS.DEGREE_3_4_MATCHING) return 4;
  return 2;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ParseRequest;
    const { raw_text, author_id, subscription_tier = 'free' } = body;

    if (!raw_text || raw_text.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required and must be at least 5 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are the AI parser for MyKonnect, a professional trust network.
Your job is to extract structured information from a user's professional service request.

ALWAYS respond with ONLY valid JSON matching this exact schema:
{
  "skill_tags": string[],       // 2-5 snake_case skill/domain tags (e.g. "contract_law", "react_native")
  "urgency": "routine" | "urgent" | "asap",
  "complexity": "simple_task" | "project" | "ongoing",
  "format": "in_person" | "remote" | "async",
  "draft_text": string,         // Clean, professional 1-2 sentence shout-out ready to send
  "confidence": number          // 0.0–1.0 how confident you are in the parse
}

Guidelines:
- skill_tags should be specific and searchable (prefer "contract_law" over "law")
- urgency: asap = hours, urgent = 1-3 days, routine = flexible
- complexity: simple_task = one-off, project = defined scope, ongoing = recurring
- draft_text should be professional, concise, and start with "Need" or "Looking for"
- Do NOT include markdown, explanation, or any text outside the JSON object.

SLANG AWARENESS — users may write in Gen Z or informal language. Translate to professional language in draft_text and extract accurate skill_tags:

Cannabis / regulated industry slang (treat as cannabis_industry, cannabis_law, or dispensary_operations context):
- zaaa / zaza / za → cannabis / marijuana
- gas / loud / exotic / fire / fye → high-quality cannabis product
- boof / reggie / mids → cannabis (lower grade)
- chronic / kush / green / herb / bud / tree → cannabis
- cart / cartridge / dab / wax / shatter → cannabis concentrate / vape product
- plug (in product context) → supplier / vendor

Business & hustle slang:
- "secure the bag" / "bag secured" → close a business deal / generate revenue
- "the bag" → revenue / income / funding
- "my grind" / "on my grind" → entrepreneurship / business development
- "CEO era" / "in my ___ era" → current professional focus area (e.g. "CEO era" = launching a business)
- "drop" / "drops" → product launch / content release
- "collab" → collaboration / partnership
- "plug" (person context) → industry connection / warm introduction
- "clout" → social media influence / brand awareness / audience reach
- "drip" / "fit" → fashion design / brand aesthetic / visual identity
- "vibe" / "vibes" → brand culture / aesthetic / tone of voice
- "lowkey" / "highkey" → remove or replace with "somewhat" / "very"
- "no cap" / "fr fr" / "on god" → truthfulness markers — omit from draft_text
- "hits different" → unique value proposition / stands out in the market
- "bussin" → high quality (food, product, service)
- "slay" / "slaying" → excelling / performing exceptionally well
- "it's giving ___" → it resembles / it has the aesthetic of
- "understood the assignment" → delivered exactly what was needed
- "main character energy" → confident / self-directed leadership
- "rent free" → top-of-mind concern / persistent challenge
- "W" / "L" → win / loss (business outcome)
- "glow up" → brand refresh / transformation / rebrand
- "come through" → deliver / show up / help out
- "on fleek" → perfectly executed
- "goat" → top performer / expert
- "big moves" → significant business decisions or strategy
- "level up" → scale / grow / improve
- "ate (that)" → executed perfectly
- "mogging" → outperforming / dominating the market
- "rizz" (in business context) → charisma / sales presence / pitch quality
- "based" → reliable / principled / authentic brand positioning
- "NPC" → disengaged / passive (use to infer need for engagement strategy)

If slang is ambiguous (e.g. "plug" could be a person or product), infer from context.
Always write draft_text in clear professional English regardless of input slang.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: raw_text }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '{}';
    // Claude sometimes wraps JSON in ```json ... ``` fences despite the system
    // prompt telling it not to. Strip them before parsing.
    const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed: ParseResponse = JSON.parse(jsonText);

    // ─── Phase 2: degree-expansion matching ────────────────────────────────
    // Only run when the caller supplied an author_id. The matching phase is
    // best-effort — any failure here falls through and the parse result is
    // still returned.
    if (author_id) {
      try {
        const matches = await findMatchesForShout(
          author_id,
          parsed.skill_tags,
          subscription_tier,
        );
        if (matches.length > 0) {
          parsed.matches = matches;
        }
      } catch (matchErr) {
        console.error('[parse-shout] match phase failed:', matchErr);
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Match phase ──────────────────────────────────────────────────────────────
// Walks the connections graph server-side via the `get_connections_at_degree`
// Postgres function, scores every candidate with `calculate_match_score`, and
// returns the top 3 matches with their full trust path.
//
// Gating rules:
//   - Free tier and unflagged users are hard-capped at degree 2. The graph walk
//     never fetches candidates beyond that depth — we pass the cap into the
//     Postgres function so the recursion itself stops there.
//   - Degree 2+ expansion only runs if the top degree-1 score is below the
//     STOP_EXPANSION_THRESHOLD (0.65) — strong 1st-degree matches win early.
async function findMatchesForShout(
  authorId: string,
  skillTags: string[],
  subscriptionTier: 'free' | 'premium' | 'corporate',
): Promise<MatchPreview[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.warn('[parse-shout] service-role env missing; skipping match phase');
    return [];
  }

  const supa = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const maxDegree = getMaxDegreeForUser(subscriptionTier);

  // ── Phase A: degree-1 walk ─────────────────────────────────────────────────
  const degree1Candidates = await walkAndScore(supa, authorId, skillTags, 1);
  if (degree1Candidates.length === 0 && maxDegree === 1) return [];

  const topDegree1Score = degree1Candidates[0]?.final_score ?? 0;

  // Strong 1st-degree result → done, no expansion
  if (topDegree1Score >= STOP_EXPANSION_THRESHOLD || maxDegree < 2) {
    return degree1Candidates.slice(0, 3);
  }

  // ── Phase B: expand to degree 2 ────────────────────────────────────────────
  const degree2Candidates = await walkAndScore(supa, authorId, skillTags, 2);

  // ── Phase C: expand beyond 2 only if flagged on ────────────────────────────
  // When DEGREE_3_4_MATCHING is false we NEVER issue the deeper walk — the
  // Postgres function itself is called with a target_degree of 2, so the
  // recursion stops at depth 2 regardless of candidate quality.
  let deeperCandidates: MatchPreview[] = [];
  if (maxDegree >= 3) {
    deeperCandidates = await walkAndScore(supa, authorId, skillTags, maxDegree);
  }

  // ── Phase D: ghost-bridge candidates via shared hashed contacts ────────────
  const ghostCandidates = await ghostBridgedMatches(supa, authorId, skillTags);

  // Merge, dedupe by matched_user_id (keep best score), rank
  const byId = new Map<string, MatchPreview>();
  for (const m of [
    ...degree1Candidates,
    ...degree2Candidates,
    ...deeperCandidates,
    ...ghostCandidates,
  ]) {
    const prev = byId.get(m.matched_user_id);
    if (!prev || m.final_score > prev.final_score) {
      byId.set(m.matched_user_id, m);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 3);
}

// Finds users who share hashed contacts with the author and treats them as
// 2nd-degree matches with a synthetic ghost-bridge trust path.
async function ghostBridgedMatches(
  supa: ReturnType<typeof createClient>,
  authorId: string,
  skillTags: string[],
): Promise<MatchPreview[]> {
  if (skillTags.length === 0) return [];

  // Service-role bypasses the SECURITY DEFINER self-check by calling the
  // underlying join directly rather than through the RPC.
  const { data: bridgeRows, error: bridgeErr } = await supa
    .from('hashed_contacts')
    .select('hash, hash_type, user_id')
    .in('hash', ((await supa
      .from('hashed_contacts')
      .select('hash')
      .eq('user_id', authorId)
    ).data ?? []).map((r: { hash: string }) => r.hash));

  if (bridgeErr || !bridgeRows) return [];

  // Aggregate shared counts per other user.
  const counts = new Map<string, number>();
  for (const r of bridgeRows as { user_id: string }[]) {
    if (r.user_id === authorId) continue;
    counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const bridgedIds = Array.from(counts.keys());
  const { data: profiles, error: profErr } = await supa
    .from('profiles')
    .select('id, skill_tags, full_name, trust_tier, trust_score, avatar_url')
    .in('id', bridgedIds);

  if (profErr || !profiles) return [];

  const scored: MatchPreview[] = [];
  for (const profile of profiles as {
    id: string;
    skill_tags: string[];
    full_name: string;
    trust_tier: 'Member' | 'Connector' | 'Trusted' | 'Founding';
    trust_score: number;
    avatar_url: string | null;
  }[]) {
    const overlap = skillTags.filter((t) => profile.skill_tags?.includes(t));
    if (overlap.length === 0) continue;
    const overlapRatio = overlap.length / Math.max(skillTags.length, 1);
    const sharedCount = counts.get(profile.id) ?? 1;
    // Ghost bridges: modest weight that grows with shared count, capped.
    const bridgeWeight = Math.min(0.4 + 0.15 * Math.min(sharedCount, 3), 0.85);
    const degreeDecay = 0.85; // 2nd-degree
    const finalScore = Math.max(0, Math.min(1, overlapRatio * degreeDecay * bridgeWeight));

    scored.push({
      matched_user_id: profile.id,
      degree: 2,
      trust_path: [
        {
          user_id: profile.id,
          full_name: profile.full_name,
          trust_tier: profile.trust_tier,
          trust_score: profile.trust_score,
          avatar_url: profile.avatar_url,
          degree: 2,
        },
      ],
      final_score: finalScore,
      skill_overlap: overlap,
      ghost_bridge_count: sharedCount,
    });
  }

  return scored;
}

// Issues the graph walk at the given target degree, then scores every unique
// candidate and returns them sorted best-first.
async function walkAndScore(
  supa: ReturnType<typeof createClient>,
  authorId: string,
  skillTags: string[],
  targetDegree: number,
): Promise<MatchPreview[]> {
  const { data: rows, error } = await supa.rpc('get_connections_at_degree', {
    start_user_id: authorId,
    target_degree: targetDegree,
  });

  if (error) {
    console.error('[walkAndScore] rpc error:', error);
    return [];
  }

  type WalkRow = { profile_id: string; path: string[]; degree: number };
  const walkRows = (rows as WalkRow[] | null) ?? [];
  if (walkRows.length === 0) return [];

  // Pull all candidate + bridge profiles in two queries
  const candidateIds = Array.from(new Set(walkRows.map((r) => r.profile_id)));
  const bridgeIds    = Array.from(new Set(walkRows.flatMap((r) => r.path)));

  const [profilesRes, candidateProfilesRes] = await Promise.all([
    supa.from('profiles').select('id, full_name, trust_tier, trust_score, avatar_url').in('id', bridgeIds),
    supa.from('profiles').select('id, skill_tags, full_name, trust_tier, trust_score, avatar_url').in('id', candidateIds),
  ]);

  if (profilesRes.error || candidateProfilesRes.error) {
    console.error('[walkAndScore] profile fetch error:',
      profilesRes.error ?? candidateProfilesRes.error);
    return [];
  }

  type HopProfile = {
    id: string;
    full_name: string;
    trust_tier: 'Member' | 'Connector' | 'Trusted' | 'Founding';
    trust_score: number;
    avatar_url: string | null;
  };
  type CandidateProfile = HopProfile & { skill_tags: string[] };

  const profileById = new Map<string, HopProfile>(
    (profilesRes.data as HopProfile[]).map((p) => [p.id, p]),
  );
  const candidateById = new Map<string, CandidateProfile>(
    (candidateProfilesRes.data as CandidateProfile[]).map((p) => [p.id, p]),
  );

  // Score each candidate in JS (mirrors the Postgres fn — cheaper than a
  // round-trip per candidate and we've already got the profiles in memory).
  const scored: MatchPreview[] = [];
  for (const row of walkRows) {
    const candidate = candidateById.get(row.profile_id);
    if (!candidate) continue;

    const overlap = skillTags.filter((t) => candidate.skill_tags?.includes(t));
    if (overlap.length === 0) continue;

    const overlapRatio = overlap.length / Math.max(skillTags.length, 1);
    const degreeDecay  = Math.pow(0.85, Math.max(row.degree - 1, 0));

    // Bridge weight: product over intermediate hops (skip start + terminal)
    let bridgeWeight = 1.0;
    const trustPath: TrustPathHop[] = [];
    for (let i = 1; i < row.path.length; i++) {
      const hopId = row.path[i];
      const hopProfile = profileById.get(hopId) ?? candidateById.get(hopId);
      if (!hopProfile) continue;
      const hopDegree = i as MatchDegree; // path[1] = 1st-degree, path[2] = 2nd, ...
      trustPath.push({
        user_id: hopProfile.id,
        full_name: hopProfile.full_name,
        trust_tier: hopProfile.trust_tier,
        trust_score: hopProfile.trust_score,
        avatar_url: hopProfile.avatar_url,
        degree: (hopDegree <= 6 ? hopDegree : 6) as MatchDegree,
      });
      // Bridges are intermediate hops only
      if (i < row.path.length - 1) {
        bridgeWeight *= hopProfile.trust_score / 100;
      }
    }

    const finalScore = Math.max(0, Math.min(1, overlapRatio * degreeDecay * bridgeWeight));

    scored.push({
      matched_user_id: candidate.id,
      degree: (Math.min(Math.max(row.degree, 1), 6) as MatchDegree),
      trust_path: trustPath,
      final_score: finalScore,
      skill_overlap: overlap,
    });
  }

  return scored.sort((a, b) => b.final_score - a.final_score);
}
