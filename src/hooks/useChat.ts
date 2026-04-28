import { useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, invokeEdgeFunction } from '../lib/supabase';
import { runLocalModeration, normaliseInput, getSuggestion } from '../utils/moderationPatterns';
import { useSession } from './useSession';
import type {
  Chat,
  ChatMessage,
  ChatReportReason,
  ModerationResult,
  ApiResult,
} from '../types';

export function useChat() {
  const { profile } = useSession();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);

  // ─── fetchChat ──────────────────────────────────────────────────────────────
  const fetchChat = useCallback(
    async (shoutId: string): Promise<ApiResult<Chat>> => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('chats')
          .select(
            `*, messages:chat_messages(*, sender:profiles(*)), shout:shouts(*)`
          )
          .eq('shout_id', shoutId)
          .order('created_at', { referencedTable: 'chat_messages', ascending: true })
          .limit(50, { referencedTable: 'chat_messages' })
          .single();

        if (error) return { data: null, error: { message: error.message } };

        // Fetch participants separately (UUID array → profiles join isn't natively supported)
        const participantIds: string[] = data.participant_ids ?? [];
        let participants = [];
        if (participantIds.length > 0) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantIds);
          participants = pData ?? [];
        }

        const enriched: Chat = { ...data, participants, messages: data.messages ?? [] };
        setChat(enriched);
        setMessages(enriched.messages ?? []);
        setIsChatLocked(enriched.is_locked);
        return { data: enriched, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch chat';
        return { data: null, error: { message } };
      } finally {
        setIsFetching(false);
      }
    },
    [],
  );

  // ─── moderateMessage ────────────────────────────────────────────────────────
  const moderateMessage = useCallback(async (body: string): Promise<ModerationResult> => {
    const normalised = normaliseInput(body);

    // Layer 1: instant local check
    const local = runLocalModeration(normalised);
    if (!local.passed) {
      return {
        passed: false,
        risk_score: 1.0,
        category: local.category,
        reason: local.reason,
        suggestion: local.category ? getSuggestion(local.category) : null,
      };
    }

    // Layer 2: Claude Haiku — fail open on any network error
    setIsScreening(true);
    try {
      const { data, error } = await invokeEdgeFunction<
        { raw_text: string },
        { passed: boolean; risk_score: number; category: string | null; reason: string | null; suggestion: string | null }
      >('moderate-shout', { raw_text: normalised });

      if (!error && data) {
        return {
          passed: data.passed,
          risk_score: data.risk_score,
          category: data.category,
          reason: data.reason,
          suggestion: data.suggestion,
        };
      }
    } catch {
      // Fail open
    } finally {
      setIsScreening(false);
    }

    return { passed: true, risk_score: 0, category: null, reason: null };
  }, []);

  // ─── sendMessage ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (chatId: string, body: string): Promise<ApiResult<ChatMessage>> => {
      if (!profile) return { data: null, error: { message: 'Not authenticated' } };

      const modResult = await moderateMessage(body);
      if (!modResult.passed) {
        return {
          data: null,
          error: {
            message: modResult.reason ?? 'Message did not pass content moderation.',
            code: modResult.category ?? undefined,
          },
        };
      }

      setIsSending(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({ chat_id: chatId, sender_id: profile.id, body: body.trim() })
          .select('*, sender:profiles(*)')
          .single();

        if (error) return { data: null, error: { message: error.message } };

        await supabase
          .from('chats')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', chatId);

        return { data: data as ChatMessage, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        return { data: null, error: { message } };
      } finally {
        setIsSending(false);
      }
    },
    [profile, moderateMessage],
  );

  // ─── markMessagesRead ───────────────────────────────────────────────────────
  const markMessagesRead = useCallback(
    async (chatId: string): Promise<void> => {
      if (!profile) return;
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .eq('is_read', false)
        .neq('sender_id', profile.id);
    },
    [profile],
  );

  // ─── subscribeToMessages ────────────────────────────────────────────────────
  const subscribeToMessages = useCallback(
    (chatId: string, onNewMessage: (message: ChatMessage) => void): RealtimeChannel => {
      return supabase
        .channel(`chat-messages-${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            onNewMessage(payload.new as ChatMessage);
          },
        )
        .subscribe();
    },
    [],
  );

  // ─── reportMessage ──────────────────────────────────────────────────────────
  const reportMessage = useCallback(
    async (
      chatId: string,
      messageId: string,
      reportedUserId: string,
      reason: ChatReportReason,
      description?: string,
    ): Promise<ApiResult<null>> => {
      if (!profile) return { data: null, error: { message: 'Not authenticated' } };
      try {
        await supabase
          .from('chat_messages')
          .update({ is_flagged: true })
          .eq('id', messageId);

        const { error } = await supabase.from('chat_reports').insert({
          chat_id: chatId,
          message_id: messageId,
          reporter_id: profile.id,
          reported_user_id: reportedUserId,
          reason,
          description: description ?? null,
        });

        if (error) return { data: null, error: { message: error.message } };
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit report';
        return { data: null, error: { message } };
      }
    },
    [profile],
  );

  // ─── markJobComplete ────────────────────────────────────────────────────────
  const markJobComplete = useCallback(
    async (chatId: string): Promise<ApiResult<null>> => {
      try {
        const { error: updateError } = await supabase
          .from('chats')
          .update({ job_marked_complete: true })
          .eq('id', chatId);

        if (updateError) return { data: null, error: { message: updateError.message } };

        const { error: rpcError } = await supabase.rpc('award_completion_points', {
          p_chat_id: chatId,
        });

        if (rpcError) return { data: null, error: { message: rpcError.message } };
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to mark job complete';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  // ─── blockUser ──────────────────────────────────────────────────────────────
  const blockUser = useCallback(
    async (reportedUserId: string): Promise<ApiResult<null>> => {
      if (!profile) return { data: null, error: { message: 'Not authenticated' } };
      try {
        const { error } = await supabase
          .from('blocked_users')
          .insert({ blocker_id: profile.id, blocked_id: reportedUserId });

        if (error) return { data: null, error: { message: error.message } };
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to block user';
        return { data: null, error: { message } };
      }
    },
    [profile],
  );

  return {
    chat,
    messages,
    setMessages,
    isFetching,
    isSending,
    isScreening,
    isChatLocked,
    fetchChat,
    sendMessage,
    moderateMessage,
    markMessagesRead,
    subscribeToMessages,
    reportMessage,
    markJobComplete,
    blockUser,
  };
}
