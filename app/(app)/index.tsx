import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoutCard } from '../../src/components/ShoutCard';
import { KonnectPointsBadge } from '../../src/components/KonnectPointsBadge';
import { Avatar } from '../../src/components/Avatar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { TrustBadge } from '../../src/components/TrustBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { useSession } from '../../src/hooks/useSession';
import { useShouts } from '../../src/hooks/useShouts';
import { useShoutStore } from '../../src/store/shoutStore';
import { useReduceMotion } from '../../src/utils';
import { LogoMark } from '../../src/components/Logo';
import { ShoutIcon } from '../../src/components/ShoutIcon';
import { useTheme } from '../../src/hooks/useTheme';
import type { ShoutOut } from '../../src/types';

const HEADER_CONTENT_HEIGHT = 62; // visible header below the status bar

const STUB_SHOUTS: ShoutOut[] = [
  {
    id: 'stub-1',
    author_id: 'user-2',
    raw_text: 'Need a contract lawyer to review an NDA — quick turnaround',
    voice_url: null,
    draft_text: 'Need a contract lawyer to review an NDA — quick turnaround, B2B deal closing this week.',
    skill_tags: ['contract_law', 'NDA', 'B2B'],
    urgency: 'urgent',
    complexity: 'simple_task',
    format: 'async',
    ai_confidence: 0.94,
    status: 'active',
    matched_user_ids: [],
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
  },
  {
    id: 'stub-2',
    author_id: 'user-3',
    raw_text: 'Looking for a senior React Native dev for a 2-week sprint',
    voice_url: null,
    draft_text: 'Looking for a senior React Native developer for a 2-week sprint — building a fintech MVP, remote OK.',
    skill_tags: ['react_native', 'typescript', 'fintech', 'mobile'],
    urgency: 'routine',
    complexity: 'project',
    format: 'remote',
    ai_confidence: 0.89,
    status: 'active',
    matched_user_ids: [],
    accepted_by_id: null,
    completed_at: null,
    cancelled_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'user-3',
      email: 'priya@ventures.io',
      full_name: 'Priya Anand',
      avatar_url: null,
      headline: 'CTO · Fintech Ventures',
      location: 'NYC',
      bio: null,
      skill_tags: ['engineering_leadership', 'fintech'],
      trust_score: 91,
      trust_tier: 'Founding',
      konnect_points: 820,
      completion_rate: 0.97,
      response_time_median_hours: 1.1,
      total_completions: 31,
      status: 'active',
      is_premium: true,
      joined_at: '2024-07-15T00:00:00Z',
      last_active_at: new Date().toISOString(),
    },
  },
  {
    id: 'stub-3',
    author_id: 'user-4',
    raw_text: 'Need an interior designer for a home office refresh',
    voice_url: null,
    draft_text: 'Need an interior designer to help refresh my home office — prefer someone with a modern minimalist eye.',
    skill_tags: ['interior_design', 'home_office', 'minimalist'],
    urgency: 'routine',
    complexity: 'simple_task',
    format: 'in_person',
    ai_confidence: 0.87,
    status: 'active',
    matched_user_ids: [],
    accepted_by_id: null,
    completed_at: null,
    cancelled_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'user-4',
      email: 'alex@realty.com',
      full_name: 'Alex Kimura',
      avatar_url: null,
      headline: 'Real Estate Attorney',
      location: 'Boston, MA',
      bio: null,
      skill_tags: ['real_estate_law', 'contracts'],
      trust_score: 65,
      trust_tier: 'Connector',
      konnect_points: 175,
      completion_rate: 0.82,
      response_time_median_hours: 4.2,
      total_completions: 8,
      status: 'active',
      is_premium: false,
      joined_at: '2024-11-01T00:00:00Z',
      last_active_at: new Date().toISOString(),
    },
  },
];

type FeedItem =
  | { type: 'shout'; shout: ShoutOut; index: number }
  | { type: 'divider'; label: string };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

  const { profile } = useSession();
  const { activeShouts, isFetching, refreshFeed, deleteShout } = useShouts();
  const setSelectedShout = useShoutStore((s) => s.setSelectedShout);
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  const greetingFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      greetingFade.setValue(1);
      return;
    }
    Animated.timing(greetingFade, {
      toValue: 1,
      duration: 400,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, greetingFade]);

  const source = activeShouts.length > 0 ? activeShouts : STUB_SHOUTS;

  const firstDegree = source.filter((s) => !s.second_degree_match);
  const secondDegree = source.filter((s) => s.second_degree_match?.is_second_degree);

  let shoutIndex = 0;
  const feedItems: FeedItem[] = [
    ...firstDegree.map((s): FeedItem => ({ type: 'shout', shout: s, index: shoutIndex++ })),
    ...(secondDegree.length > 0
      ? [
          { type: 'divider', label: 'From your extended circle' } as FeedItem,
          ...secondDegree.map((s): FeedItem => ({ type: 'shout', shout: s, index: shoutIndex++ })),
        ]
      : []),
  ];

  const handleDeleteShout = useCallback(
    async (shoutId: string) => {
      const result = await deleteShout(shoutId);
      if (result.error) Alert.alert('Error', result.error.message);
    },
    [deleteShout],
  );

  const handleShoutPress = useCallback(
    (shout: ShoutOut) => {
      if (!profile) return;
      const isParticipant =
        shout.author_id === profile.id || shout.matched_user_ids.includes(profile.id);
      if (isParticipant) {
        setSelectedShout(shout);
        router.push({ pathname: '/(app)/shout-detail', params: { shoutId: shout.id } });
      } else {
        Alert.alert('Not your shout', 'This shout-out is not yours.');
      }
    },
    [profile, setSelectedShout],
  );

  const ListHeader = () => (
    <View style={{ paddingTop: headerHeight }}>
      {/* Trust profile card */}
      {profile && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#4F6EF7',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={colors.gradientElevated}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ padding: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 16 }}>Your Trust Profile</Text>
                <TrustBadge tier={profile.trust_tier} score={profile.trust_score} showScore size="sm" />
              </View>
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Completions</Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 22 }}>{profile.total_completions}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Rate</Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 22 }}>
                    {Math.round(profile.completion_rate * 100)}%
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Avg Response</Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 22 }}>
                    {(profile.response_time_median_hours ?? 0).toFixed(1)}h
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}

      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18 }}>Circle Feed</Text>
        <TouchableOpacity>
          <Text style={{ color: '#4F6EF7', fontSize: 14 }}>Filter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={feedItems}
        keyExtractor={(item, index) =>
          item.type === 'shout' ? item.shout.id : `divider-${index}`
        }
        renderItem={({ item }) => {
          if (item.type === 'divider') {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 12 }}>
                  {item.label}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>
            );
          }
          {
            const cardDegree = item.shout.match_degree ?? 1;
            // 2nd-degree cards get a very subtle tint so they're distinguishable
            // from direct-circle cards without shouting for attention.
            const secondDegreeTint =
              cardDegree === 2
                ? { backgroundColor: 'rgba(79,110,247,0.04)', borderRadius: 16 }
                : null;
            return (
              <View style={[{ paddingHorizontal: 20, marginBottom: 12 }, secondDegreeTint]}>
                <ShoutCard
                  shout={item.shout}
                  onPress={handleShoutPress}
                  isOwner={item.shout.author_id === profile?.id}
                  isMatched={item.shout.matched_user_ids?.includes(profile?.id ?? '')}
                  matchDegree={item.shout.match_degree}
                  onDelete={handleDeleteShout}
                  onOpenChat={(shoutId) =>
                    router.push({ pathname: '/(app)/chat', params: { shoutId } })
                  }
                  index={item.index}
                />
              </View>
            );
          }
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isFetching ? (
            <LoadingSpinner label="Loading your feed…" />
          ) : (
            <EmptyState
              emoji="📭"
              title="Your circle is quiet"
              subtitle="When your connections post shout-outs, they'll appear here. Be the first — post a need!"
              actionLabel="Broadcast"
              onAction={() => router.push('/(app)/shout')}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refreshFeed} tintColor="#4F6EF7" />
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />

      {/* Frosted glass floating header — covers full area from top of screen */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          overflow: 'hidden',
        }}
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: insets.top,
              paddingHorizontal: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderGlass,
            }}
          >
            <Animated.View style={{ opacity: greetingFade, alignItems: 'center' }}>
              <LogoMark size={62} />
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontFamily: 'Inter-Bold', letterSpacing: -0.3, marginTop: 1 }}>
                My<Text style={{ color: '#4F6EF7' }}>Konnect</Text>
              </Text>
            </Animated.View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {profile && <KonnectPointsBadge points={profile.konnect_points} size="sm" />}
              <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={{ alignItems: 'center' }}>
                <Avatar
                  name={profile?.full_name ?? 'User'}
                  avatarUrl={profile?.avatar_url}
                  trustTier={profile?.trust_tier ?? 'Member'}
                  size="sm"
                  showTierRing
                />
                <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'Inter-Medium', marginTop: 2 }}>
                  {profile?.full_name?.split(' ')[0] ?? ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 96,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          shadowColor: '#4F6EF7',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.55,
          shadowRadius: 18,
          elevation: 12,
        }}
        onPress={() => router.push('/(app)/shout')}
        activeOpacity={0.82}
      >
        {/* Outer glow ring */}
        <View
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 36,
            backgroundColor: 'rgba(79,110,247,0.18)',
          }}
        />
        <LinearGradient
          colors={['#6B84F8', '#4F6EF7', '#3A55E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
          }}
        >
          {/* Inner highlight arc */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 32,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <ShoutIcon size={36} active={true} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
