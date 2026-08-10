import { useCallback, useEffect, useState } from 'react';
import { db, invokeEdgeFunction, supabase } from '../lib/supabase';
import { useShoutStore } from '../store/shoutStore';
import { useSession } from './useSession';
import { getMaxDegreeForUser } from '../lib/degreeMatching';
import type {
  ApiResult,
  DegreeExpansionResult,
  MatchDegree,
  SecondDegreeMatch,
  ShoutOut,
  ShoutParseResult,
  SubscriptionTier,
  TrustPathHop,
  UserProfile,
} from '../types';

// ─── Cosine Similarity Helpers ───────────────────────────────────────────────

function buildTagVector(tags: string[], vocabulary: string[]): number[] {
  return vocabulary.map((v) => (tags.includes(v) ? 1 : 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

const TRUST_TIER_WEIGHT: Record<string, number> = {
  Founding: 1.0,
  Trusted: 0.85,
  Connector: 0.7,
  Member: 0.5,
};

// Minimum cosine similarity required regardless of degree
const SIMILARITY_THRESHOLD = 0.65;

// How much each additional degree discounts the final score
// index = degree, so DEGREE_WEIGHTS[2] = weight for 2nd-degree, etc.
const DEGREE_WEIGHTS: Record<number, number> = {
  2: 1.0,
  3: 0.85,
  4: 0.70,
  5: 0.55,
  6: 0.40,
};

const MAX_FRONTIER_PER_LEVEL = 50; // prevents exponential blow-up
const MAX_CANDIDATES = 200;

export function useShouts() {
  const { userId, profile } = useSession();
  // Degree cap respects the feature flags — while DEGREE_3_4_MATCHING and
  // DEGREE_5_6_MATCHING are both false this resolves to 2 for everyone.
  const subscriptionTier: SubscriptionTier =
    profile?.subscription_tier ?? (profile?.is_premium ? 'premium' : 'free');
  const maxDegree = getMaxDegreeForUser(subscriptionTier);
  const {
    activeShouts,
    draftParse,
    isCreating,
    isParsing,
    setActiveShouts,
    prependShout,
    updateShout,
    removeShout,
    setDraftParse,
    setCreating,
    setParsing,
    clearDraft,
  } = useShoutStore();

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ─── Extended Network Enrichment (up to 6 degrees) ─────────────────────────
  const enrichWithSecondDegree = useCallback(
    async (shouts: ShoutOut[]): Promise<ShoutOut[]> => {
      if (!userId) return shouts;

      try {
        // ── Step 1: Fetch user's direct (1st-degree) connections ──────────────
        const { data: firstDegreeRows } = await db
          .connections()
          .select('requester_id, addressee_id')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted');

        if (!firstDegreeRows || firstDegreeRows.length === 0) return shouts;

        const firstDegreeIds = firstDegreeRows.map((r) =>
          r.requester_id === userId ? r.addressee_id : r.requester_id,
        );

        // ── Step 2: BFS up to MAX_DEGREE levels ───────────────────────────────
        // visited: every node we've seen (including user + 1st-degree)
        const visited = new Set<string>([userId, ...firstDegreeIds]);

        // candidates: nodeId → { bridgeId (direct 1st-degree contact), degree }
        const candidates = new Map<string, { bridgeId: string; degree: number }>();

        // frontierWithBridge: nodeId → bridgeId (the 1st-degree contact that
        // forms the start of the path to this node)
        let frontierWithBridge = new Map<string, string>(
          firstDegreeIds.map((id) => [id, id]),
        );

        for (let degree = 2; degree <= maxDegree; degree++) {
          if (frontierWithBridge.size === 0) break;
          if (candidates.size >= MAX_CANDIDATES) break;

          // Trim frontier to avoid query explosion
          const frontierIds = Array.from(frontierWithBridge.keys()).slice(
            0,
            MAX_FRONTIER_PER_LEVEL,
          );

          const { data: edgeRows } = await db
            .connections()
            .select('requester_id, addressee_id')
            .or(
              frontierIds
                .map((id) => `requester_id.eq.${id},addressee_id.eq.${id}`)
                .join(','),
            )
            .eq('status', 'accepted');

          if (!edgeRows || edgeRows.length === 0) break;

          const nextFrontierWithBridge = new Map<string, string>();

          for (const row of edgeRows) {
            // Determine which endpoint is the frontier node and which is the neighbor
            const aInFrontier = frontierWithBridge.has(row.requester_id);
            const bInFrontier = frontierWithBridge.has(row.addressee_id);

            for (const [frontierNode, neighborId] of [
              aInFrontier ? [row.requester_id, row.addressee_id] : null,
              bInFrontier ? [row.addressee_id, row.requester_id] : null,
            ] as [string, string][]) {
              if (!frontierNode || !neighborId) continue;
              if (visited.has(neighborId)) continue;

              visited.add(neighborId);

              const bridge = frontierWithBridge.get(frontierNode)!;
              candidates.set(neighborId, { bridgeId: bridge, degree });
              nextFrontierWithBridge.set(neighborId, bridge);

              if (candidates.size >= MAX_CANDIDATES) break;
            }

            if (candidates.size >= MAX_CANDIDATES) break;
          }

          frontierWithBridge = nextFrontierWithBridge;
        }

        if (candidates.size === 0) return shouts;

        // ── Step 3: Fetch all candidate + bridge profiles in two queries ──────
        const candidateIds = Array.from(candidates.keys());
        const bridgeIds = Array.from(new Set(Array.from(candidates.values()).map((c) => c.bridgeId)));

        const [{ data: candidateProfiles }, { data: bridgeProfiles }] = await Promise.all([
          db.profiles().select('*').in('id', candidateIds),
          db.profiles().select('*').in('id', bridgeIds),
        ]);

        if (!candidateProfiles || !bridgeProfiles) return shouts;

        const candidateById = new Map<string, UserProfile>(
          (candidateProfiles as UserProfile[]).map((p) => [p.id, p]),
        );
        const bridgeById = new Map<string, UserProfile>(
          (bridgeProfiles as UserProfile[]).map((p) => [p.id, p]),
        );

        // ── Step 4: Score each shout against every candidate ─────────────────
        const allCandidateTags = candidateIds.flatMap(
          (id) => candidateById.get(id)?.skill_tags ?? [],
        );

        const enriched: ShoutOut[] = shouts.map((shout) => {
          if (shout.author_id === userId) return shout;
          if (shout.matched_user_ids.includes(userId)) return shout;

          const vocabulary = Array.from(
            new Set([...shout.skill_tags, ...allCandidateTags]),
          );
          if (vocabulary.length === 0) return shout;

          const shoutVec = buildTagVector(shout.skill_tags, vocabulary);
          let bestMatch: SecondDegreeMatch | null = null;

          for (const [candidateId, { bridgeId, degree }] of candidates) {
            const candidate = candidateById.get(candidateId);
            const bridge = bridgeById.get(bridgeId);
            if (!candidate || !bridge) continue;

            const candidateVec = buildTagVector(candidate.skill_tags, vocabulary);
            const similarity = cosineSimilarity(shoutVec, candidateVec);

            // Must clear the similarity threshold regardless of degree
            if (similarity < SIMILARITY_THRESHOLD) continue;

            const tierWeight = TRUST_TIER_WEIGHT[candidate.trust_tier] ?? 0.5;
            const degreeWeight = DEGREE_WEIGHTS[degree] ?? 0.4;
            const finalScore = similarity * tierWeight * degreeWeight;

            if (!bestMatch || finalScore > bestMatch.final_score) {
              bestMatch = {
                recommended_user: candidate,
                bridge_contact: bridge,
                final_score: finalScore,
                degree,
                is_second_degree: true,
              };
            }
          }

          if (!bestMatch) return shout;
          return { ...shout, second_degree_match: bestMatch };
        });

        // ── Step 5: Ghost-bridge fallback via shared hashed contacts ─────────
        // For any shout that still lacks a second_degree_match, see whether the
        // viewer shares hashed contacts with the author. If so, silently bridge
        // them at degree=2 with a null bridge_contact + ghost_bridge_count.
        const shoutsNeedingFallback = enriched.filter(
          (s) => !s.second_degree_match && s.author_id !== userId,
        );
        if (shoutsNeedingFallback.length === 0) return enriched;

        const { data: bridgeRows } = await supabase.rpc('get_contact_bridged_users', {
          start_user_id: userId,
        });
        const ghostCountByUserId = new Map<string, number>();
        for (const row of (bridgeRows ?? []) as { profile_id: string; shared_count: number }[]) {
          ghostCountByUserId.set(row.profile_id, row.shared_count);
        }
        if (ghostCountByUserId.size === 0) return enriched;

        // Fetch the bridged users' profiles so we can score skill overlap.
        const missingIds = Array.from(ghostCountByUserId.keys()).filter(
          (id) => !candidateById.has(id),
        );
        const bridgedProfiles = new Map<string, UserProfile>();
        if (missingIds.length > 0) {
          const { data: fetched } = await db.profiles().select('*').in('id', missingIds);
          for (const p of (fetched as UserProfile[] | null) ?? []) {
            bridgedProfiles.set(p.id, p);
          }
        }
        for (const [id, cprofile] of candidateById) {
          if (ghostCountByUserId.has(id)) bridgedProfiles.set(id, cprofile);
        }

        return enriched.map((shout) => {
          if (shout.second_degree_match || shout.author_id === userId) return shout;
          const sharedCount = ghostCountByUserId.get(shout.author_id);
          if (!sharedCount) return shout;
          const bridged = bridgedProfiles.get(shout.author_id);
          if (!bridged) return shout;

          const overlap = shout.skill_tags.filter((t) => bridged.skill_tags?.includes(t));
          if (overlap.length === 0) return shout;
          const overlapRatio = overlap.length / Math.max(shout.skill_tags.length, 1);
          // Ghost bridges are treated as 2nd-degree with a modest bridge weight;
          // strength scales with count of shared contacts, capped at 3.
          const bridgeWeight = Math.min(0.4 + 0.15 * Math.min(sharedCount, 3), 0.85);
          const finalScore = Math.min(1, overlapRatio * DEGREE_WEIGHTS[2] * bridgeWeight);

          const ghostMatch: SecondDegreeMatch = {
            recommended_user: bridged,
            bridge_contact: null,
            final_score: finalScore,
            degree: 2,
            is_second_degree: true,
            ghost_bridge_count: sharedCount,
          };
          return { ...shout, second_degree_match: ghostMatch };
        });
      } catch {
        // Enrichment is best-effort — never break the feed
        return shouts;
      }
    },
    [userId, maxDegree],
  );

  // ─── Fetch Feed ─────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async () => {
    if (!userId) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await db
        .shouts()
        .select('*, author:profiles!shouts_author_id_fkey(*)')
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const shouts = (data as ShoutOut[]) ?? [];
      const enriched = await enrichWithSecondDegree(shouts);
      setActiveShouts(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shouts';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  }, [userId, setActiveShouts, enrichWithSecondDegree]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // ─── Parse Raw Input (calls Edge Function) ──────────────────────────────────
  // The edge function also runs the degree-expansion match phase when given an
  // author_id and subscription_tier, returning `matches` alongside the parse.
  const parseInput = useCallback(
    async (rawText: string): Promise<ApiResult<ShoutParseResult>> => {
      setParsing(true);
      try {
        const { data, error } = await invokeEdgeFunction<
          { raw_text: string; author_id?: string; subscription_tier?: SubscriptionTier },
          ShoutParseResult
        >('parse-shout', {
          raw_text: rawText,
          author_id: userId,
          subscription_tier: subscriptionTier,
        });

        if (error) throw error;
        if (!data) throw new Error('No parse result returned');

        setDraftParse(data);
        return { data, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parsing failed';
        return { data: null, error: { message } };
      } finally {
        setParsing(false);
      }
    },
    [setParsing, setDraftParse, userId, subscriptionTier],
  );

  // ─── Create Shout ───────────────────────────────────────────────────────────
  const createShout = useCallback(
    async (
      parseResult: ShoutParseResult,
      rawText: string,
    ): Promise<ApiResult<ShoutOut>> => {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } };
      setCreating(true);

      try {
        // Best match (if any) drives the stored match_degree + trust_path. The
        // full top-3 IDs go into matched_user_ids for the existing feed logic.
        const matches = parseResult.matches ?? [];
        const bestMatch = matches[0];

        const payload = {
          author_id: userId,
          raw_text: rawText,
          draft_text: parseResult.draft_text,
          skill_tags: parseResult.skill_tags,
          urgency: parseResult.urgency,
          complexity: parseResult.complexity,
          format: parseResult.format,
          ai_confidence: parseResult.confidence,
          status: 'active',
          matched_user_ids: matches.slice(0, 3).map((m) => m.matched_user_id),
          match_degree: bestMatch?.degree ?? null,
          trust_path: bestMatch?.trust_path ?? null,
        };

        const { data, error } = await db
          .shouts()
          .insert(payload)
          .select('*, author:profiles!shouts_author_id_fkey(*)')
          .single();

        if (error) throw error;

        const shout = data as ShoutOut;
        prependShout(shout);
        clearDraft();
        return { data: shout, error: null };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message ?? 'Failed to create shout';
        console.error('[createShout]', err);
        return { data: null, error: { message } };
      } finally {
        setCreating(false);
      }
    },
    [userId, setCreating, prependShout, clearDraft],
  );

  // ─── Delete Shout ───────────────────────────────────────────────────────────
  const deleteShout = useCallback(
    async (shoutId: string): Promise<ApiResult<null>> => {
      if (!userId) return { data: null, error: { message: 'Not authenticated' } };
      try {
        const { error } = await db
          .shouts()
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', shoutId)
          .eq('author_id', userId);

        if (error) throw error;
        removeShout(shoutId);
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete shout';
        return { data: null, error: { message } };
      }
    },
    [userId, removeShout],
  );

  // ─── Fetch Stored Matches For A Shout ───────────────────────────────────────
  // Returns the degree-expansion matches persisted against a given shout,
  // joining the full profile for each matched user so the UI can render a
  // trust path + avatar row without additional round-trips.
  const fetchMatchesForShout = useCallback(
    async (shoutId: string): Promise<ApiResult<DegreeExpansionResult[]>> => {
      try {
        const { data: shoutRow, error: shoutErr } = await db
          .shouts()
          .select('id, matched_user_ids, match_degree, trust_path, skill_tags')
          .eq('id', shoutId)
          .single();

        if (shoutErr) throw shoutErr;
        if (!shoutRow) return { data: [], error: null };

        const matchedIds = (shoutRow.matched_user_ids as string[] | null) ?? [];
        if (matchedIds.length === 0) return { data: [], error: null };

        const { data: profiles, error: profErr } = await db
          .profiles()
          .select('id, full_name, trust_tier, trust_score, avatar_url, skill_tags')
          .in('id', matchedIds);

        if (profErr) throw profErr;

        const profileById = new Map<string, UserProfile>(
          ((profiles as UserProfile[]) ?? []).map((p) => [p.id, p]),
        );

        const storedPath = (shoutRow.trust_path as TrustPathHop[] | null) ?? [];
        const storedDegree = (shoutRow.match_degree as MatchDegree | null) ?? 1;
        const shoutSkills = (shoutRow.skill_tags as string[] | null) ?? [];

        const results: DegreeExpansionResult[] = matchedIds
          .map((id) => {
            const p = profileById.get(id);
            if (!p) return null;
            const overlap = shoutSkills.filter((t) => (p.skill_tags ?? []).includes(t));
            return {
              matched_user_id: id,
              degree: storedDegree,
              trust_path: storedPath,
              final_score: 0,
              skill_overlap: overlap,
            } as DegreeExpansionResult;
          })
          .filter((r): r is DegreeExpansionResult => r !== null);

        return { data: results, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load matches';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  // ─── Confirm Completion ─────────────────────────────────────────────────────
  const confirmCompletion = useCallback(
    async (shoutId: string): Promise<ApiResult<ShoutOut>> => {
      try {
        const { data, error } = await db
          .shouts()
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', shoutId)
          .select()
          .single();

        if (error) throw error;
        updateShout(shoutId, { status: 'completed' });
        return { data: data as ShoutOut, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to confirm completion';
        return { data: null, error: { message } };
      }
    },
    [updateShout],
  );

  return {
    activeShouts,
    draftParse,
    isCreating,
    isParsing,
    isFetching,
    fetchError,
    parseInput,
    createShout,
    deleteShout,
    confirmCompletion,
    fetchMatchesForShout,
    refreshFeed: fetchFeed,
    clearDraft,
  };
}
