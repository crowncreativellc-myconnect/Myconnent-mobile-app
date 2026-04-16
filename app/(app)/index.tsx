import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoutCard } from '../../src/components/ShoutCard';
import { KonnectPointsBadge } from '../../src/components/KonnectPointsBadge';
import { Avatar } from '../../src/components/Avatar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { TrustBadge } from '../../src/components/TrustBadge';
import { useSession } from '../../src/hooks/useSession';
import { useShouts } from '../../src/hooks/useShouts';
import type { ShoutOut } from '../../src/types';

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

export default function HomeScreen() {
  const { profile } = useSession();
  const { activeShouts, isFetching, refreshFeed } = useShouts();

  const displayShouts = activeShouts.length > 0 ? activeShouts : STUB_SHOUTS;

  const handleShoutPress = useCallback((shout: ShoutOut) => {
    router.push({ pathname: '/(app)/shout/[id]', params: { id: shout.id } });
  }, []);

  const ListHeader = () => (
    <View>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
        <View>
          <Text className="text-text-muted text-sm">Good morning,</Text>
          <Text className="text-text-primary text-xl font-bold">
            {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </Text>
        </View>
        <View className="flex-row items-center gap-x-3">
          {profile && (
            <KonnectPointsBadge points={profile.konnect_points} size="sm" />
          )}
          <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
            <Avatar
              name={profile?.full_name ?? 'User'}
              avatarUrl={profile?.avatar_url}
              trustTier={profile?.trust_tier ?? 'Member'}
              size="sm"
              showTierRing
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trust tier card */}
      {profile && (
        <View className="mx-5 mb-5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-text-primary font-semibold">Your Trust Profile</Text>
            <TrustBadge tier={profile.trust_tier} score={profile.trust_score} showScore size="sm" />
          </View>
          <View className="flex-row gap-x-4">
            <View>
              <Text className="text-text-muted text-xs">Completions</Text>
              <Text className="text-text-primary font-bold text-lg">{profile.total_completions}</Text>
            </View>
            <View>
              <Text className="text-text-muted text-xs">Rate</Text>
              <Text className="text-text-primary font-bold text-lg">
                {Math.round(profile.completion_rate * 100)}%
              </Text>
            </View>
            <View>
              <Text className="text-text-muted text-xs">Avg Response</Text>
              <Text className="text-text-primary font-bold text-lg">
                {profile.response_time_median_hours.toFixed(1)}h
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Section header */}
      <View className="flex-row items-center justify-between px-5 mb-3">
        <Text className="text-text-primary font-bold text-lg">Circle Feed</Text>
        <TouchableOpacity>
          <Text className="text-brand-primary text-sm">Filter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Text className="text-4xl mb-4">📭</Text>
      <Text className="text-text-primary font-semibold text-lg mb-2 text-center">
        Your circle is quiet
      </Text>
      <Text className="text-text-secondary text-sm text-center leading-relaxed">
        When your connections post shout-outs, they'll appear here. Be the first — post a need!
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FlatList
        data={displayShouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-5 mb-3">
            <ShoutCard shout={item} onPress={handleShoutPress} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isFetching ? <LoadingSpinner label="Loading your feed…" /> : <ListEmpty />}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refreshFeed}
            tintColor="#4F6EF7"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — post a shout */}
      <TouchableOpacity
        className="absolute bottom-24 right-5 bg-brand-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/(app)/shout')}
        activeOpacity={0.85}
      >
        <Text className="text-white text-2xl">📣</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
