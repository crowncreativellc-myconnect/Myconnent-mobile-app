import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoutCard } from '../../src/components/ShoutCard';
import { ApprovalButtons } from '../../src/components/ApprovalButtons';
import { ContactCardModal } from '../../src/components/ContactCardModal';
import { FeedbackChannel } from '../../src/components/FeedbackChannel';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { useSession } from '../../src/hooks/useSession';
import { useApproval } from '../../src/hooks/useApproval';
import { supabase } from '../../src/lib/supabase';
import type {
  ShoutOut,
  ConnectionApproval,
  ContactCard,
  UserProfile,
  TrustTier,
} from '../../src/types';

interface ParticipantInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trust_tier: TrustTier;
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

// Stub shout for dev/preview
const STUB_SHOUT: ShoutOut = {
  id: 'stub-detail-1',
  author_id: 'user-2',
  raw_text: null,
  voice_url: null,
  draft_text: 'Need a contract lawyer to review an NDA — quick turnaround, B2B deal closing this week.',
  skill_tags: ['contract_law', 'NDA', 'B2B'],
  urgency: 'urgent',
  complexity: 'simple_task',
  format: 'async',
  ai_confidence: 0.94,
  status: 'active',
  matched_user_ids: ['user-3'],
  accepted_by_id: null,
  completed_at: null,
  cancelled_at: null,
  created_at: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
  updated_at: new Date().toISOString(),
  author: {
    id: 'user-2',
    email: 'marcus@firm.com',
    full_name: 'Marcus Webb',
    avatar_url: null,
    headline: 'Startup Founder · Series A',
    location: 'Boston, MA',
    bio: null,
    skill_tags: ['fundraising', 'product_strategy'],
    trust_score: 78,
    trust_tier: 'Trusted',
    konnect_points: 340,
    completion_rate: 0.91,
    response_time_median_hours: 2.4,
    total_completions: 14,
    status: 'active',
    is_premium: true,
    joined_at: '2024-09-01T00:00:00Z',
    last_active_at: new Date().toISOString(),
  },
};

const STUB_APPROVAL: ConnectionApproval = {
  id: 'approval-stub-1',
  shout_id: 'stub-detail-1',
  requester_id: 'user-2',
  matched_user_id: 'user-3',
  requester_approved: false,
  matched_user_approved: false,
  both_approved: false,
  approved_at: null,
  contact_card_exchanged: false,
  created_at: new Date().toISOString(),
};

const STUB_PARTICIPANTS: Record<string, ParticipantInfo> = {
  'user-2': { id: 'user-2', full_name: 'Marcus Webb',  avatar_url: null, trust_tier: 'Trusted'  },
  'user-3': { id: 'user-3', full_name: 'Priya Anand',  avatar_url: null, trust_tier: 'Founding' },
};

export default function ShoutDetailScreen() {
  const { shoutId } = useLocalSearchParams<{ shoutId: string }>();
  const { userId } = useSession();

  const { approveConnection, triggerContactExchange, saveToPhoneContacts, fetchApprovalStatus, subscribeToApproval } =
    useApproval();

  const [shout, setShout]               = useState<ShoutOut | null>(null);
  const [approval, setApproval]         = useState<ConnectionApproval | null>(null);
  const [otherCard, setOtherCard]       = useState<ContactCard | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [showModal, setShowModal]       = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [isApproving, setIsApproving]   = useState(false);

  // Load shout + approval on mount
  useEffect(() => {
    if (!shoutId) {
      router.replace('/(app)');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const { data: shoutData } = await supabase
          .from('shouts')
          .select('*, author:profiles!shouts_author_id_fkey(*)')
          .eq('id', shoutId)
          .single();

        if (cancelled) return;

        if (!shoutData) {
          // Fall back to stub in dev
          setShout(STUB_SHOUT);
          setApproval(STUB_APPROVAL);
          setParticipants(STUB_PARTICIPANTS);
          setIsLoading(false);
          return;
        }

        const loadedShout = shoutData as unknown as ShoutOut;

        // Access control: only participants can view this screen
        const isParticipant =
          userId && (
            loadedShout.author_id === userId ||
            loadedShout.matched_user_ids.includes(userId)
          );

        if (!isParticipant) {
          router.replace('/(app)');
          return;
        }

        setShout(loadedShout);

        const fetchedApproval = await fetchApprovalStatus(shoutId);
        if (!cancelled) setApproval(fetchedApproval);

        // Pre-fetch participant profiles
        const participantIds = [loadedShout.author_id, ...loadedShout.matched_user_ids];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, headline, avatar_url, trust_tier, trust_score')
          .in('id', participantIds);

        if (!cancelled && profilesData) {
          const map: Record<string, ParticipantInfo> = {};
          for (const p of profilesData as ProfileRow[]) {
            map[p.id] = {
              id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              trust_tier: p.trust_tier as TrustTier,
            };
          }
          setParticipants(map);
        }

        // If already both approved, pre-fetch contact cards
        if (fetchedApproval?.both_approved) {
          const cards = await triggerContactExchange(shoutId);
          if (!cancelled && cards && userId) {
            const isRequester = fetchedApproval.requester_id === userId;
            setOtherCard(isRequester ? cards.matched : cards.requester);
          }
        }
      } catch (err) {
        console.error('[ShoutDetail] load:', err instanceof Error ? err.message : err);
        setShout(STUB_SHOUT);
        setApproval(STUB_APPROVAL);
        setParticipants(STUB_PARTICIPANTS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [shoutId, userId]);

  // Subscribe to real-time approval changes
  useEffect(() => {
    if (!shoutId) return;

    const unsubscribe = subscribeToApproval(shoutId, async (updatedApproval) => {
      setApproval(updatedApproval);

      if (updatedApproval.both_approved && userId) {
        const cards = await triggerContactExchange(shoutId);
        if (cards) {
          const isRequester = updatedApproval.requester_id === userId;
          setOtherCard(isRequester ? cards.matched : cards.requester);
        }
      }
    });

    return unsubscribe;
  }, [shoutId, userId]);

  const handleApprove = useCallback(async () => {
    if (!shoutId || !userId || isApproving) return;
    setIsApproving(true);
    try {
      await approveConnection(shoutId, userId);
      const updated = await fetchApprovalStatus(shoutId);
      if (updated) setApproval(updated);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not approve. Please try again.');
    } finally {
      setIsApproving(false);
    }
  }, [shoutId, userId, isApproving, approveConnection, fetchApprovalStatus]);

  const handleSaveContacts = useCallback(async () => {
    if (otherCard) {
      try {
        await saveToPhoneContacts(otherCard);
        Alert.alert('Saved', `${otherCard.full_name} has been added to your contacts.`);
      } catch {
        // saveToPhoneContacts handles permission alerts internally
      }
    }
  }, [otherCard, saveToPhoneContacts]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </SafeAreaView>
    );
  }

  if (!shout) return null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-brand-primary text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-text-primary font-bold text-lg flex-1">Connection Detail</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Shout card */}
        <ShoutCard shout={shout} className="mb-4" />

        {/* Approval buttons */}
        {approval && userId && (
          <ApprovalButtons
            shoutId={shout.id}
            currentUserId={userId}
            approval={approval}
            onApprove={handleApprove}
            onSaveContacts={approval.both_approved ? handleSaveContacts : undefined}
          />
        )}

        {/* Contact card trigger */}
        {approval?.both_approved && otherCard && (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="bg-surface-elevated border border-surface-border rounded-2xl py-3.5 items-center mb-4"
            activeOpacity={0.8}
          >
            <Text className="text-text-primary font-semibold text-sm">
              View {otherCard.full_name}'s Contact Card
            </Text>
          </TouchableOpacity>
        )}

        {/* Feedback channel — only shown after both approve */}
        {approval?.both_approved && (
          <View style={{ minHeight: 360 }}>
            <Text className="text-text-primary font-bold text-base mb-3">Private Channel</Text>
            <FeedbackChannel
              shoutId={shout.id}
              currentUserId={userId ?? ''}
              participantProfiles={participants}
            />
          </View>
        )}
      </ScrollView>

      {/* Contact card modal */}
      {otherCard && (
        <ContactCardModal
          contactCard={otherCard}
          visible={showModal}
          onSave={async (card) => {
            await handleSaveContacts();
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </SafeAreaView>
  );
}
