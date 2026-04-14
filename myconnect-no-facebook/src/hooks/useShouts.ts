import { useCallback, useEffect, useState } from 'react';
import { db, invokeEdgeFunction } from '../lib/supabase';
import { useShoutStore } from '../store/shoutStore';
import { useSession } from './useSession';
import type { ShoutOut, ShoutParseResult, ApiResult } from '../types';

export function useShouts() {
  const { userId } = useSession();
  const {
    activeShouts,
    draftParse,
    isCreating,
    isParsing,
    setActiveShouts,
    prependShout,
    updateShout,
    setDraftParse,
    setCreating,
    setParsing,
    clearDraft,
  } = useShoutStore();

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ─── Fetch Feed ─────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async () => {
    if (!userId) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await db
        .shouts()
        .select('*, author:profiles(*)')
        .in('status', ['active', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setActiveShouts((data as ShoutOut[]) ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shouts';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  }, [userId, setActiveShouts]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // ─── Parse Raw Input (calls Edge Function) ──────────────────────────────────
  const parseInput = useCallback(
    async (rawText: string): Promise<ApiResult<ShoutParseResult>> => {
      setParsing(true);
      try {
        const { data, error } = await invokeEdgeFunction<
          { raw_text: string },
          ShoutParseResult
        >('parse-shout', { raw_text: rawText });

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
    [setParsing, setDraftParse],
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
        };

        const { data, error } = await db
          .shouts()
          .insert(payload)
          .select('*, author:profiles(*)')
          .single();

        if (error) throw error;

        const shout = data as ShoutOut;
        prependShout(shout);
        clearDraft();
        return { data: shout, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create shout';
        return { data: null, error: { message } };
      } finally {
        setCreating(false);
      }
    },
    [userId, setCreating, prependShout, clearDraft],
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
    confirmCompletion,
    refreshFeed: fetchFeed,
    clearDraft,
  };
}
