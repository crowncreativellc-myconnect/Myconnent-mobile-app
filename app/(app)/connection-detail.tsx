import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { Card } from '../../src/components/Card';
import { TrustBadge } from '../../src/components/TrustBadge';
import { KonnectPointsBadge } from '../../src/components/KonnectPointsBadge';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { db } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/hooks/useTheme';
import {
  formatSkillTag,
  formatCompletionRate,
  formatDate,
  getTierColor,
} from '../../src/utils';
import type { UserProfile } from '../../src/types';

// Passed from the connections screen via params
const STUB_PROFILES: Record<string, UserProfile> = {
  c1: {
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
  c2: {
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
  c3: {
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
  c4: {
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
};

export default function ConnectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(
    id ? (STUB_PROFILES[id] ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(!STUB_PROFILES[id ?? '']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || STUB_PROFILES[id]) return;

    setIsLoading(true);
    db.profiles()
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setProfile(data as UserProfile);
        }
        setIsLoading(false);
      });
  }, [id]);

  const handleShoutOut = () => {
    router.push('/(app)/shout');
  };

  const handleRemoveConnection = () => {
    Alert.alert(
      'Remove Connection',
      `Remove ${profile?.full_name} from your Circle of Trust?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  };

  const { colors } = useTheme();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <LoadingSpinner label="Loading profile…" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top']}>
        <Text style={{ fontSize: 36, marginBottom: 16 }}>😕</Text>
        <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 18, marginBottom: 8, textAlign: 'center' }}>
          Couldn't load this profile
        </Text>
        <Button label="Go Back" onPress={() => router.back()} variant="ghost" />
      </SafeAreaView>
    );
  }

  const tierColor = getTierColor(profile.trust_tier);
  const isOwnProfile = userId === profile.id;

  const stats = [
    { label: 'Completions', value: profile.total_completions.toString() },
    { label: 'Rate', value: formatCompletionRate(profile.completion_rate) },
    {
      label: 'Avg Response',
      value: profile.response_time_median_hours != null
        ? `${profile.response_time_median_hours.toFixed(1)}h`
        : '—',
    },
    { label: 'Trust Score', value: `${profile.trust_score}/100` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#4F6EF7', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 16 }}>Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>

          {/* Identity card */}
          <Card variant="elevated">
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Avatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                trustTier={profile.trust_tier}
                size="xl"
                showTierRing
              />
              <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold', marginTop: 16 }}>
                {profile.full_name}
              </Text>
              {profile.headline && (
                <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 4, textAlign: 'center' }}>
                  {profile.headline}
                </Text>
              )}
              {profile.location && (
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>📍 {profile.location}</Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <TrustBadge tier={profile.trust_tier} score={profile.trust_score} showScore />
                <KonnectPointsBadge points={profile.konnect_points} size="sm" />
              </View>

              {profile.is_premium && (
                <View style={{ marginTop: 12, backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: '#7C3AED', fontSize: 12, fontFamily: 'Inter-SemiBold' }}>
                    ✦ Premium Member
                  </Text>
                </View>
              )}
            </View>

            {profile.bio && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                  {profile.bio}
                </Text>
              </View>
            )}
          </Card>

          {/* Stats */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {stats.map((stat) => (
              <Card key={stat.label} variant="bordered" style={{ flex: 1, minWidth: '40%', alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontFamily: 'Inter-Bold' }}>{stat.value}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Skills */}
          {profile.skill_tags.length > 0 && (
            <Card variant="bordered">
              <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Skills
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.skill_tags.map((tag) => (
                  <View
                    key={tag}
                    style={{ backgroundColor: 'rgba(79,110,247,0.1)', borderWidth: 1, borderColor: 'rgba(79,110,247,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <Text style={{ color: '#4F6EF7', fontSize: 14, fontFamily: 'Inter-Medium' }}>
                      {formatSkillTag(tag)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Trust tier context */}
          <View
            style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, backgroundColor: `${tierColor}15`, borderColor: `${tierColor}30` }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', marginBottom: 4, color: tierColor }}>
              {profile.trust_tier} Member
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              Member since {formatDate(profile.joined_at)}
            </Text>
          </View>

          {/* Actions */}
          {!isOwnProfile && (
            <View style={{ gap: 12, marginTop: 8 }}>
              <Button
                label="Broadcast"
                onPress={handleShoutOut}
                fullWidth
                size="lg"
              />
              <Button
                label="Remove from Circle"
                onPress={handleRemoveConnection}
                variant="ghost"
                fullWidth
                size="md"
              />
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
