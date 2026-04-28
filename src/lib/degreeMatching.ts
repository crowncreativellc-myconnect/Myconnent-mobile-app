// ─── Degree Matching ──────────────────────────────────────────────────────────
// Client-side helpers for the degree-of-separation matching system.
//
// The authoritative scoring formula in `getTrustPathWeight` is duplicated in
// the Postgres function `calculate_match_score` (supabase migration
// 20250006_add_degree_matching.sql). Any change here must be mirrored there —
// the two implementations MUST produce the same score for the same inputs.
// ─────────────────────────────────────────────────────────────────────────────

import { FEATURE_FLAGS, isFeatureEnabled } from '../constants/featureFlags';
import type { MatchDegree, SubscriptionTier, TrustPathHop } from '../types';

/**
 * Returns the maximum degree this user is allowed to search.
 *
 * Today all tiers max out at degree 2 because both DEGREE_3_4_MATCHING and
 * DEGREE_5_6_MATCHING are `false`. Flipping those flags is the only change
 * required to unlock deeper expansion — the logic below is already wired.
 *
 * When flags are enabled:
 *   - free      → 2
 *   - premium   → 4  (requires DEGREE_3_4_MATCHING)
 *   - corporate → 6  (requires DEGREE_5_6_MATCHING)
 */
export function getMaxDegreeForUser(subscriptionTier: SubscriptionTier): MatchDegree {
  if (subscriptionTier === 'corporate' && isFeatureEnabled('DEGREE_5_6_MATCHING')) {
    return 6;
  }
  if (
    (subscriptionTier === 'corporate' || subscriptionTier === 'premium') &&
    isFeatureEnabled('DEGREE_3_4_MATCHING')
  ) {
    return 4;
  }
  return 2;
}

/**
 * Builds a human-readable trust path for display in the UI.
 * Example: "You → Marcus Webb (Trusted) → Priya Anand (Founding, 91 score)"
 */
export function buildTrustPath(hops: TrustPathHop[]): string {
  if (hops.length === 0) return 'You';
  const segments = hops.map((hop, idx) => {
    const isLast = idx === hops.length - 1;
    if (isLast) {
      return `${hop.full_name} (${hop.trust_tier}, ${hop.trust_score} score)`;
    }
    return `${hop.full_name} (${hop.trust_tier})`;
  });
  return ['You', ...segments].join(' → ');
}

/**
 * Calculates the trust weight multiplier for a match.
 *
 * Formula:
 *   weight = 1.0
 *   for each hop beyond the 1st degree: weight *= 0.85
 *   for each BRIDGE contact in the path: weight *= (bridge_trust_score / 100)
 *
 * The "bridge" contacts are every hop except the final (terminal) match — they
 * are the people vouching along the path. A 2nd-degree match via a Founding-
 * tier bridge (score 91) scores significantly higher than the same match via a
 * Member-tier bridge (score 30).
 *
 * NOTE: This implementation must stay byte-for-byte identical in behaviour to
 * the Postgres `calculate_match_score` function.
 */
export function getTrustPathWeight(path: TrustPathHop[]): number {
  if (path.length === 0) return 1.0;

  let weight = 1.0;

  // One 0.85 penalty per hop beyond the 1st degree
  const terminalDegree = path[path.length - 1].degree;
  for (let d = 2; d <= terminalDegree; d++) {
    weight *= 0.85;
  }

  // Bridge contacts are all hops EXCEPT the terminal match
  for (let i = 0; i < path.length - 1; i++) {
    const bridge = path[i];
    weight *= bridge.trust_score / 100;
  }

  return weight;
}

/**
 * Returns a short human label for a degree ("In your circle", "2nd degree", …).
 */
export function formatDegreeLabel(degree: MatchDegree): string {
  switch (degree) {
    case 1:
      return 'In your circle';
    case 2:
      return '2nd degree';
    case 3:
      return '3rd degree';
    case 4:
      return '4th degree';
    case 5:
      return '5th degree';
    case 6:
      return '6th degree';
  }
}

// Re-export for convenience — callers typically need both the helpers and the
// flag object when wiring up gating decisions.
export { FEATURE_FLAGS };
