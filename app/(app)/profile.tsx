import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge, TrustScoreBar } from '../../src/components/TrustBadge';
import { KonnectPointsBadge } from '../../src/components/KonnectPointsBadge';
import { Card, CardHeader } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { useSession } from '../../src/hooks/useSession';
import { formatSkillTag, formatCompletionRate, formatDate } from '../../src/utils';

export default function ProfileScreen() {
  const { profile } = useSession();

  if (!profile) {
    return <LoadingSpinner label="Loading profile…" />;
  }

  const stats = [
    { label: 'Completions', value: profile.total_completions.toString() },
    { label: 'Completion Rate', value: formatCompletionRate(profile.completion_rate) },
    { label: 'Avg Response', value: `${profile.response_time_median_hours.toFixed(1)}h` },
    { label: 'Trust Score', value: `${profile.trust_score}/100` },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header actions */}
        <View className="flex-row items-center justify-between px-5 pt-4 mb-4">
          <Text className="text-text-primary text-2xl font-bold">Profile</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/settings')}>
            <Text className="text-brand-primary text-base">Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Identity card */}
        <View className="px-5 mb-5">
          <Card variant="elevated">
            <View className="items-center py-4">
              <Avatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                trustTier={profile.trust_tier}
                size="xl"
                showTierRing
              />
              <Text className="text-text-primary text-2xl font-bold mt-4">
                {profile.full_name}
              </Text>
              {profile.headline && (
                <Text className="text-text-secondary text-base mt-1">{profile.headline}</Text>
              )}
              {profile.location && (
                <Text className="text-text-muted text-sm mt-0.5">📍 {profile.location}</Text>
              )}

              <View className="flex-row items-center gap-x-3 mt-4">
                <TrustBadge tier={profile.trust_tier} score={profile.trust_score} showScore />
                <KonnectPointsBadge points={profile.konnect_points} size="sm" />
              </View>

              {profile.is_premium && (
                <View className="mt-3 bg-brand-secondary/10 border border-brand-secondary/30 rounded-full px-3 py-1">
                  <Text className="text-brand-secondary text-xs font-semibold">
                    ✦ Premium Member
                  </Text>
                </View>
              )}
            </View>

            {profile.bio && (
              <View className="border-t border-surface-border pt-4 mt-2">
                <Text className="text-text-secondary text-sm leading-relaxed text-center">
                  {profile.bio}
                </Text>
              </View>
            )}

            <View className="border-t border-surface-border pt-4 mt-4">
              <Button
                label="Edit Profile"
                variant="secondary"
                fullWidth
                size="sm"
                onPress={() => router.push('/(app)/profile-edit')}
              />
            </View>
          </Card>
        </View>

        {/* Trust score bar */}
        <View className="px-5 mb-5">
          <Card variant="bordered">
            <CardHeader>
              <Text className="text-text-primary font-semibold">Trust & Reputation</Text>
            </CardHeader>
            <TrustScoreBar score={profile.trust_score} tier={profile.trust_tier} />
            <Text className="text-text-muted text-xs mt-3 leading-relaxed">
              Your score is calculated from completion rate, review quality, response time, peer vouching, and recent activity.
            </Text>
          </Card>
        </View>

        {/* Stats grid */}
        <View className="px-5 mb-5">
          <Text className="text-text-primary font-bold text-lg mb-3">Activity</Text>
          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} variant="bordered" className="flex-1 min-w-[40%] items-center py-4">
                <Text className="text-text-primary text-2xl font-bold">{stat.value}</Text>
                <Text className="text-text-muted text-xs mt-1 text-center">{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Skills */}
        {profile.skill_tags.length > 0 && (
          <View className="px-5 mb-5">
            <Text className="text-text-primary font-bold text-lg mb-3">Skills</Text>
            <Card variant="bordered">
              <View className="flex-row flex-wrap gap-2">
                {profile.skill_tags.map((tag) => (
                  <View
                    key={tag}
                    className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-3 py-1.5"
                  >
                    <Text className="text-brand-primary text-sm font-medium">
                      {formatSkillTag(tag)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Member since */}
        <View className="px-5">
          <Text className="text-text-muted text-xs text-center">
            Member since {formatDate(profile.joined_at)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
