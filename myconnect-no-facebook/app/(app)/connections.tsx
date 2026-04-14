import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { formatSkillTag, formatCompletionRate } from '../../src/utils';
import type { UserProfile } from '../../src/types';

const STUB_CONNECTIONS: UserProfile[] = [
  {
    id: 'c1',
    email: 'marcus@firm.com',
    full_name: 'Marcus Webb',
    avatar_url: null,
    headline: 'Startup Founder · Series A',
    location: 'Boston, MA',
    bio: 'Building the next wave of B2B SaaS. Ex-Google, ex-Stripe.',
    skill_tags: ['fundraising', 'product_strategy', 'b2b_sales'],
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
  {
    id: 'c2',
    email: 'priya@ventures.io',
    full_name: 'Priya Anand',
    avatar_url: null,
    headline: 'CTO · Fintech Ventures',
    location: 'NYC',
    bio: 'Full-stack engineering leader. Love building distributed systems.',
    skill_tags: ['react_native', 'typescript', 'python', 'system_design'],
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
  {
    id: 'c3',
    email: 'alex@realty.com',
    full_name: 'Alex Kimura',
    avatar_url: null,
    headline: 'Real Estate Attorney',
    location: 'Boston, MA',
    bio: 'Real estate law, contracts, and commercial leasing.',
    skill_tags: ['real_estate_law', 'contracts', 'commercial_leasing'],
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
  {
    id: 'c4',
    email: 'dana@design.co',
    full_name: 'Dana Osei',
    avatar_url: null,
    headline: 'Senior UX Designer',
    location: 'Remote',
    bio: 'Designing digital products people actually want to use.',
    skill_tags: ['ux_design', 'figma', 'product_design', 'branding'],
    trust_score: 72,
    trust_tier: 'Connector',
    konnect_points: 210,
    completion_rate: 0.88,
    response_time_median_hours: 3.0,
    total_completions: 11,
    status: 'active',
    is_premium: false,
    joined_at: '2024-10-10T00:00:00Z',
    last_active_at: new Date().toISOString(),
  },
];

interface ConnectionCardProps {
  profile: UserProfile;
  onPress: (profile: UserProfile) => void;
}

function ConnectionCard({ profile, onPress }: ConnectionCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => onPress(profile)}>
      <Card variant="bordered" className="mb-3">
        <View className="flex-row items-center mb-3">
          <Avatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            trustTier={profile.trust_tier}
            size="md"
            showTierRing
          />
          <View className="flex-1 ml-3">
            <View className="flex-row items-center gap-x-2 flex-wrap">
              <Text className="text-text-primary font-semibold">{profile.full_name}</Text>
              <TrustBadge tier={profile.trust_tier} size="sm" />
            </View>
            <Text className="text-text-muted text-xs mt-0.5">{profile.headline}</Text>
            <Text className="text-text-muted text-xs">{profile.location}</Text>
          </View>
          <View className="items-end">
            <Text className="text-konnect-gold text-xs font-semibold">⬡ {profile.trust_score}</Text>
            <Text className="text-text-muted text-xs mt-0.5">{formatCompletionRate(profile.completion_rate)}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {profile.skill_tags.slice(0, 4).map((tag) => (
            <View key={tag} className="bg-surface-elevated rounded-lg px-2 py-0.5">
              <Text className="text-text-secondary text-xs">{formatSkillTag(tag)}</Text>
            </View>
          ))}
          {profile.skill_tags.length > 4 && (
            <View className="bg-surface-elevated rounded-lg px-2 py-0.5">
              <Text className="text-text-muted text-xs">+{profile.skill_tags.length - 4}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ConnectionsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trusted' | 'founding'>('all');

  const filtered = STUB_CONNECTIONS.filter((c) => {
    const matchSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.skill_tags.some((t) => t.includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all' ||
      (filter === 'trusted' && (c.trust_tier === 'Trusted' || c.trust_tier === 'Founding')) ||
      (filter === 'founding' && c.trust_tier === 'Founding');
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1">
        <View className="px-5 pt-4 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary text-2xl font-bold">Circle of Trust</Text>
            <View className="bg-brand-primary/10 rounded-full px-3 py-1">
              <Text className="text-brand-primary text-sm font-semibold">
                {STUB_CONNECTIONS.length} connections
              </Text>
            </View>
          </View>

          <View className="bg-surface-card border border-surface-border rounded-2xl px-4 py-3 flex-row items-center mb-4">
            <Text className="text-text-muted mr-2">🔍</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or skill…"
              placeholderTextColor="#4A5578"
              className="flex-1 text-text-primary text-sm"
            />
          </View>

          <View className="flex-row gap-x-2">
            {(['all', 'trusted', 'founding'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 border ${
                  filter === f
                    ? 'bg-brand-primary border-brand-primary'
                    : 'bg-surface-card border-surface-border'
                }`}
              >
                <Text className={`text-sm font-medium capitalize ${filter === f ? 'text-white' : 'text-text-secondary'}`}>
                  {f === 'all' ? 'All' : f === 'trusted' ? 'Trusted+' : 'Founding'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-5">
              <ConnectionCard profile={item} onPress={() => {}} />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">🔗</Text>
              <Text className="text-text-secondary text-base text-center">
                No connections match your search.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        <View className="absolute bottom-24 left-5 right-5">
          <Button label="Invite a Trusted Connection" fullWidth size="md" variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  );
}
