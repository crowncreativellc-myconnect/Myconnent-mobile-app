// ─── Feature Flags ────────────────────────────────────────────────────────────
// Single source of truth for all feature gating in MyKonnect.
//
// While a flag is `false` the associated feature is COMPLETELY invisible to
// users — no locked padlocks, no upgrade prompts, nothing. It simply does not
// exist yet. Flipping a flag to `true` is the only change needed to activate
// the feature everywhere it is gated.
//
// This file is deliberately a plain static object today. When remote config is
// introduced, only the body of `isFeatureEnabled` needs to change — call sites
// remain stable.
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  /**
   * Unlocks 3rd and 4th degree matching expansion in the AI matching engine.
   * Tier: Premium. Not yet live.
   */
  DEGREE_3_4_MATCHING: false,

  /**
   * Unlocks 5th and 6th degree matching expansion in the AI matching engine.
   * Tier: Corporate. Not yet live.
   */
  DEGREE_5_6_MATCHING: false,

  /**
   * Enables the full subscription paywall, plan pickers, and billing flows.
   * Tier: gates Premium + Corporate tiers. Not yet live.
   */
  PREMIUM_SUBSCRIPTIONS: false,

  /**
   * Shows in-app upgrade nudges, padlock icons, and "upgrade to unlock" prompts.
   * Tier: monetisation UX. Not yet live.
   */
  SHOW_UPGRADE_NUDGES: false,

  /**
   * Enforces monthly broadcast limits for the free tier.
   * Tier: gates free → premium usage ceiling. Not yet live.
   */
  BROADCAST_LIMITS: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Returns the current state of a feature flag.
 *
 * Call sites should always use this helper instead of reading
 * `FEATURE_FLAGS[flag]` directly — this indirection lets us swap the static
 * object for a remote config fetch later without touching any callers.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
