import { useState } from 'react';
import { invokeEdgeFunction } from '../lib/supabase';
import { runLocalModeration, normaliseInput, getSuggestion } from '../utils/moderationPatterns';

export { normaliseInput };

export interface ModerationResult {
  passed: boolean;
  category: string | null;
  reason: string | null;
  suggestion: string | null;
}

interface EdgeModerationResponse {
  passed: boolean;
  risk_score: number;
  category: string | null;
  reason: string | null;
  suggestion: string | null;
}

export function useModeration() {
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [isScreening, setIsScreening] = useState(false);

  async function runPreScreen(rawText: string): Promise<ModerationResult> {
    try {
      const normalised = normaliseInput(rawText);

      // Layer 1: instant local pattern check on the normalised string — no API call
      const local = runLocalModeration(normalised);

      if (!local.passed) {
        const result: ModerationResult = {
          passed: false,
          category: local.category,
          reason: local.reason,
          suggestion: local.category ? getSuggestion(local.category) : null,
        };
        setModerationResult(result);
        return result;
      }

      // Layer 2: lightweight API moderation — send the normalised text
      setIsScreening(true);

      try {
        const { data, error } = await invokeEdgeFunction<
          { raw_text: string },
          EdgeModerationResponse
        >('moderate-shout', { raw_text: normalised });

        if (error || !data) {
          // Network failure → default to passed so users are never silently blocked
          const passResult: ModerationResult = {
            passed: true,
            category: null,
            reason: null,
            suggestion: null,
          };
          setModerationResult(passResult);
          return passResult;
        }

        const result: ModerationResult = {
          passed: data.passed,
          category: data.category,
          reason: data.reason,
          suggestion: data.suggestion ?? (data.category ? getSuggestion(data.category) : null),
        };

        setModerationResult(result);
        return result;
      } finally {
        setIsScreening(false);
      }
    } catch (err) {
      console.error('[useModeration] runPreScreen:', err instanceof Error ? err.message : err);
      // Fail open on unexpected errors
      const passResult: ModerationResult = {
        passed: true,
        category: null,
        reason: null,
        suggestion: null,
      };
      setModerationResult(passResult);
      setIsScreening(false);
      return passResult;
    }
  }

  function clearModeration(): void {
    setModerationResult(null);
  }

  return { runPreScreen, moderationResult, isScreening, clearModeration };
}
