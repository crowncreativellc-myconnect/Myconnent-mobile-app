import { Alert, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '../lib/supabase';
import type { ConnectionApproval, ContactCard, TrustTier } from '../types';

interface ContactExchangeResult {
  requester: ContactCard;
  matched: ContactCard;
}

interface ApprovalRow {
  id: string;
  shout_id: string;
  requester_id: string;
  matched_user_id: string;
  requester_approved: boolean;
  matched_user_approved: boolean;
  both_approved: boolean;
  approved_at: string | null;
  contact_card_exchanged: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  headline: string | null;
  avatar_url: string | null;
  trust_tier: string;
  trust_score: number;
}

function rowToApproval(row: ApprovalRow): ConnectionApproval {
  return row;
}

function rowToContactCard(row: ProfileRow): ContactCard {
  return {
    user_id: row.id,
    full_name: row.full_name,
    email: row.email,
    headline: row.headline ?? '',
    avatar_url: row.avatar_url,
    trust_tier: row.trust_tier as TrustTier,
    trust_score: row.trust_score,
  };
}

export function useApproval() {
  async function fetchApprovalStatus(shoutId: string): Promise<ConnectionApproval | null> {
    try {
      const { data, error } = await supabase
        .from('connection_approvals')
        .select('*')
        .eq('shout_id', shoutId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? rowToApproval(data as ApprovalRow) : null;
    } catch (err) {
      console.error('[useApproval] fetchApprovalStatus:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  async function approveConnection(shoutId: string, userId: string): Promise<void> {
    try {
      const { data: approval, error: fetchError } = await supabase
        .from('connection_approvals')
        .select('requester_id, matched_user_id')
        .eq('shout_id', shoutId)
        .single();

      if (fetchError || !approval) throw new Error(fetchError?.message ?? 'Approval record not found');

      const isRequester = (approval as ApprovalRow).requester_id === userId;
      const isMatched   = (approval as ApprovalRow).matched_user_id === userId;

      if (!isRequester && !isMatched) throw new Error('User is not a participant in this approval');

      const updatePayload = isRequester
        ? { requester_approved: true }
        : { matched_user_approved: true };

      const { data: updated, error: updateError } = await supabase
        .from('connection_approvals')
        .update(updatePayload)
        .eq('shout_id', shoutId)
        .select('*')
        .single();

      if (updateError || !updated) throw new Error(updateError?.message ?? 'Update failed');

      if ((updated as ApprovalRow).both_approved) {
        await triggerContactExchange(shoutId);
      }
    } catch (err) {
      console.error('[useApproval] approveConnection:', err instanceof Error ? err.message : err);
      throw err;
    }
  }

  async function triggerContactExchange(shoutId: string): Promise<ContactExchangeResult | null> {
    try {
      const { data: approval, error: approvalError } = await supabase
        .from('connection_approvals')
        .select('requester_id, matched_user_id')
        .eq('shout_id', shoutId)
        .single();

      if (approvalError || !approval) throw new Error(approvalError?.message ?? 'Approval not found');

      const { requester_id, matched_user_id } = approval as ApprovalRow;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, headline, avatar_url, trust_tier, trust_score')
        .in('id', [requester_id, matched_user_id]);

      if (profilesError || !profiles || profiles.length < 2) {
        throw new Error(profilesError?.message ?? 'Profiles not found');
      }

      const requesterRow = (profiles as ProfileRow[]).find((p) => p.id === requester_id);
      const matchedRow   = (profiles as ProfileRow[]).find((p) => p.id === matched_user_id);

      if (!requesterRow || !matchedRow) throw new Error('Could not resolve both profiles');

      await supabase
        .from('connection_approvals')
        .update({ contact_card_exchanged: true })
        .eq('shout_id', shoutId);

      return {
        requester: rowToContactCard(requesterRow),
        matched: rowToContactCard(matchedRow),
      };
    } catch (err) {
      console.error('[useApproval] triggerContactExchange:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  async function saveToPhoneContacts(contactCard: ContactCard): Promise<void> {
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Contacts Permission Required',
          'MyConnect needs access to your contacts to save this person. You can enable it in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      const nameParts = contactCard.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? contactCard.full_name;
      const lastName  = nameParts.slice(1).join(' ') || undefined;

      const contact: Contacts.Contact = {
        name: contactCard.full_name,
        contactType: Contacts.ContactTypes.Person,
        firstName,
        lastName,
        emails: [{ email: contactCard.email, label: 'work', id: '0' }],
        note: 'Connected via MyConnect',
      };

      if (contactCard.phone) {
        contact.phoneNumbers = [{ number: contactCard.phone, label: 'mobile', id: '0' }];
      }

      await Contacts.addContactAsync(contact);
    } catch (err) {
      console.error('[useApproval] saveToPhoneContacts:', err instanceof Error ? err.message : err);
      throw err;
    }
  }

  function subscribeToApproval(
    shoutId: string,
    callback: (approval: ConnectionApproval) => void,
  ): () => void {
    const channel = supabase
      .channel(`approval:${shoutId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_approvals',
          filter: `shout_id=eq.${shoutId}`,
        },
        (payload) => callback(payload.new as ConnectionApproval),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  return {
    approveConnection,
    triggerContactExchange,
    saveToPhoneContacts,
    fetchApprovalStatus,
    subscribeToApproval,
  };
}
