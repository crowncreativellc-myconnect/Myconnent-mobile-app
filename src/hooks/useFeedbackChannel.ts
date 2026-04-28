import { supabase } from '../lib/supabase';
import type { FeedbackChannel, FeedbackMessage, PointsEventType } from '../types';

interface MessageRow {
  id: string;
  shout_id: string;
  sender_id: string | null;
  body: string;
  is_system_message: boolean;
  created_at: string;
}

interface ChannelRow {
  id: string;
  shout_id: string;
  participant_ids: string[];
  is_active: boolean;
  points_awarded: boolean;
  created_at: string;
}

interface ApprovalRow {
  requester_id: string;
  matched_user_id: string;
}

interface ProfilePointsRow {
  id: string;
  konnect_points: number;
  trust_score: number;
}

function rowToMessage(row: MessageRow): FeedbackMessage {
  return row;
}

export function useFeedbackChannel() {
  async function fetchChannel(shoutId: string): Promise<FeedbackChannel | null> {
    try {
      const { data: channelData, error: channelError } = await supabase
        .from('feedback_channels')
        .select('*')
        .eq('shout_id', shoutId)
        .maybeSingle();

      if (channelError) throw new Error(channelError.message);
      if (!channelData) return null;

      const { data: messagesData, error: messagesError } = await supabase
        .from('feedback_messages')
        .select('*')
        .eq('shout_id', shoutId)
        .order('created_at', { ascending: true });

      if (messagesError) throw new Error(messagesError.message);

      const channel = channelData as ChannelRow;
      return {
        ...channel,
        messages: (messagesData as MessageRow[]).map(rowToMessage),
      };
    } catch (err) {
      console.error('[useFeedbackChannel] fetchChannel:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  async function sendMessage(shoutId: string, body: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('feedback_messages').insert({
        shout_id: shoutId,
        sender_id: user.id,
        body: body.trim(),
        is_system_message: false,
      });

      if (error) throw new Error(error.message);
    } catch (err) {
      console.error('[useFeedbackChannel] sendMessage:', err instanceof Error ? err.message : err);
      throw err;
    }
  }

  function subscribeToMessages(
    shoutId: string,
    callback: (message: FeedbackMessage) => void,
  ): () => void {
    const channel = supabase
      .channel(`feedback_messages:${shoutId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback_messages',
          filter: `shout_id=eq.${shoutId}`,
        },
        (payload) => callback(rowToMessage(payload.new as MessageRow)),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  async function awardCompletionPoints(shoutId: string): Promise<void> {
    try {
      // 1. Guard against double-awarding
      const { data: channelData, error: channelError } = await supabase
        .from('feedback_channels')
        .select('points_awarded')
        .eq('shout_id', shoutId)
        .single();

      if (channelError) throw new Error(channelError.message);
      if ((channelData as ChannelRow).points_awarded) return;

      // 2. Get participant IDs from approval
      const { data: approvalData, error: approvalError } = await supabase
        .from('connection_approvals')
        .select('requester_id, matched_user_id')
        .eq('shout_id', shoutId)
        .single();

      if (approvalError || !approvalData) throw new Error(approvalError?.message ?? 'Approval not found');

      const { requester_id, matched_user_id } = approvalData as ApprovalRow;

      // 3. Check if messages were exchanged (non-system messages from both parties)
      const { count: messageCount, error: countError } = await supabase
        .from('feedback_messages')
        .select('*', { count: 'exact', head: true })
        .eq('shout_id', shoutId)
        .eq('is_system_message', false);

      if (countError) throw new Error(countError.message);
      const hasMessages = (messageCount ?? 0) > 0;

      // 4. Fetch current balances
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, konnect_points, trust_score')
        .in('id', [requester_id, matched_user_id]);

      if (profilesError || !profilesData || profilesData.length < 2) {
        throw new Error(profilesError?.message ?? 'Profiles not found');
      }

      const profiles = profilesData as ProfilePointsRow[];
      const requester = profiles.find((p) => p.id === requester_id)!;
      const matched   = profiles.find((p) => p.id === matched_user_id)!;

      const matchedDelta   = 50 + (hasMessages ? 10 : 0);
      const requesterDelta = 20 + (hasMessages ? 10 : 0);

      const matchedBalanceAfter   = matched.konnect_points + matchedDelta;
      const requesterBalanceAfter = requester.konnect_points + requesterDelta;

      // 5. Insert ledger rows
      const ledgerRows: Array<{
        user_id: string;
        event_type: PointsEventType;
        delta: number;
        balance_after: number;
        reference_id: string;
        description: string;
      }> = [
        {
          user_id: matched_user_id,
          event_type: 'completion',
          delta: 50,
          balance_after: matched.konnect_points + 50,
          reference_id: shoutId,
          description: 'Fulfilled a shout-out connection',
        },
        {
          user_id: requester_id,
          event_type: 'feedback_completion',
          delta: 20,
          balance_after: requester.konnect_points + 20,
          reference_id: shoutId,
          description: 'Completed the connection loop',
        },
      ];

      if (hasMessages) {
        ledgerRows.push(
          {
            user_id: matched_user_id,
            event_type: 'feedback_bonus',
            delta: 10,
            balance_after: matchedBalanceAfter,
            reference_id: shoutId,
            description: 'Feedback channel engagement bonus',
          },
          {
            user_id: requester_id,
            event_type: 'feedback_bonus',
            delta: 10,
            balance_after: requesterBalanceAfter,
            reference_id: shoutId,
            description: 'Feedback channel engagement bonus',
          },
        );
      }

      const { error: ledgerError } = await supabase.from('points_ledger').insert(ledgerRows);
      if (ledgerError) throw new Error(ledgerError.message);

      // 6. Update profiles
      await Promise.all([
        supabase
          .from('profiles')
          .update({ konnect_points: matchedBalanceAfter })
          .eq('id', matched_user_id),
        supabase
          .from('profiles')
          .update({ konnect_points: requesterBalanceAfter })
          .eq('id', requester_id),
      ]);

      // 7. Lock against re-award
      const { error: lockError } = await supabase
        .from('feedback_channels')
        .update({ points_awarded: true })
        .eq('shout_id', shoutId);

      if (lockError) throw new Error(lockError.message);
    } catch (err) {
      console.error('[useFeedbackChannel] awardCompletionPoints:', err instanceof Error ? err.message : err);
      throw err;
    }
  }

  async function closeChannel(shoutId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('feedback_channels')
        .update({ is_active: false })
        .eq('shout_id', shoutId);

      if (error) throw new Error(error.message);

      await awardCompletionPoints(shoutId);
    } catch (err) {
      console.error('[useFeedbackChannel] closeChannel:', err instanceof Error ? err.message : err);
      throw err;
    }
  }

  return { fetchChannel, sendMessage, subscribeToMessages, awardCompletionPoints, closeChannel };
}
