import React from 'react';
import { View, Text, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { KonnectPointsBadge, PointsEarnedPill } from '../../src/components/KonnectPointsBadge';
import { TrustBadge, TrustScoreBar } from '../../src/components/TrustBadge';
import { useSession } from '../../src/hooks/useSession';
import { formatRelativeTime } from '../../src/utils';
import type { PointsLedgerEntry, TrustTier } from '../../src/types';

// ─── Stub ledger ──────────────────────────────────────────────────────────────
const STUB_LEDGER: PointsLedgerEntry[] = [
  {
    id: 'l1',
    user_id: 'me',
    event_type: 'completion',
    delta: 50,
    balance_after: 340,
    reference_id: 'shout-1',
    description: 'Completed: Contract review for Marcus Webb',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'l2',
    user_id: 'me',
    event_type: 'strong_review',
    delta: 20,
    balance_after: 290,
    reference_id: 'review-1',
    description: 'Received 5-star review from Marcus Webb',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'l3',
    user_id: 'me',
    event_type: 'fast_response',
    delta: 5,
    balance_after: 270,
    reference_id: 'shout-2',
    description: 'Fast response bonus — responded within 1 hour',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'l4',
    user_id: 'me',
    event_type: 'streak_bonus',
    delta: 40,
    balance_after: 265,
    reference_id: null,
    description: 'Monthly streak bonus — 3 completions this month',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'l5',
    user_id: 'me',
    event_type: 'referral_completion',
    delta: 30,
    balance_after: 225,
    reference_id: 'ref-1',
    description: 'Referral bonus — Alex Kimura completed first job',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

const TIER_THRESHOLDS: { tier: TrustTier; minPoints: number; label: string }[] = [
  { tier: 'Member', minPoints: 0, label: '0 pts' },
  { tier: 'Connector', minPoints: 100, label: '100 pts' },
  { tier: 'Trusted', minPoints: 300, label: '300 pts' },
  { tier: 'Founding', minPoints: 700, label: '700 pts' },
];

const EARN_WAYS = [
  { emoji: '✅', label: 'Complete a job', points: '+50 pts' },
  { emoji: '⭐', label: 'Receive a strong review (4+ stars + written)', points: '+20 pts' },
  { emoji: '🔗', label: 'Successful referral completes first job', points: '+30 pts' },
  { emoji: '⚡', label: 'Fast response to a matched shout-out', points: '+5 pts' },
  { emoji: '🔥', label: 'Monthly streak bonus (3 completions)', points: '+40 pts' },
];

export default function PointsScreen() {
  const { profile } = useSession();
  const points = profile?.konnect_points ?? 0;
  const tier = profile?.trust_tier ?? 'Member';
  const trustScore = profile?.trust_score ?? 0;

  // Find next tier
  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
  const nextTier = TIER_THRESHOLDS[currentIdx + 1];
  const progressToNext = nextTier
    ? Math.min(1, (points - TIER_THRESHOLDS[currentIdx]!.minPoints) / (nextTier.minPoints - TIER_THRESHOLDS[currentIdx]!.minPoints))
    : 1;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-text-primary text-2xl font-bold mb-1">Konnect Points</Text>
          <Text className="text-text-secondary text-sm">
            Earned through genuine contribution — cannot be bought.
          </Text>
        </View>

        {/* Points hero card */}
        <View className="px-5 mt-5 mb-5">
          <Card variant="elevated" className="items-center py-8">
            <KonnectPointsBadge points={points} size="lg" />
            <View className="mt-4 mb-4">
              <TrustBadge tier={tier} score={trustScore} showScore />
            </View>

            {nextTier ? (
              <View className="w-full px-4">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-text-muted text-xs">{tier}</Text>
                  <Text className="text-text-muted text-xs">{nextTier.tier} at {nextTier.label}</Text>
                </View>
                <View className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <View
                    className="h-full bg-konnect-gold rounded-full"
                    style={{ width: `${progressToNext * 100}%` }}
                  />
                </View>
                <Text className="text-text-muted text-xs mt-1.5 text-center">
                  {nextTier.minPoints - points} pts to {nextTier.tier}
                </Text>
              </View>
            ) : (
              <Text className="text-konnect-gold text-sm font-semibold mt-2">
                🏆 Maximum tier achieved — Founding Member
              </Text>
            )}
          </Card>
        </View>

        {/* Trust score bar */}
        <View className="px-5 mb-5">
          <Card variant="bordered">
            <TrustScoreBar score={trustScore} tier={tier} />
          </Card>
        </View>

        {/* How to earn */}
        <View className="px-5 mb-5">
          <Text className="text-text-primary font-bold text-lg mb-3">How to earn</Text>
          <Card variant="bordered">
            {EARN_WAYS.map((way, idx) => (
              <View
                key={way.label}
                className={`flex-row items-center py-3 ${
                  idx < EARN_WAYS.length - 1 ? 'border-b border-surface-border' : ''
                }`}
              >
                <Text className="text-xl mr-3">{way.emoji}</Text>
                <Text className="flex-1 text-text-secondary text-sm">{way.label}</Text>
                <Text className="text-brand-accent text-sm font-bold">{way.points}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Ledger */}
        <View className="px-5">
          <Text className="text-text-primary font-bold text-lg mb-3">Recent activity</Text>
          <View className="gap-y-3">
            {STUB_LEDGER.map((entry) => (
              <Card key={entry.id} variant="bordered">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-text-primary text-sm font-medium">
                      {entry.description}
                    </Text>
                    <Text className="text-text-muted text-xs mt-1">
                      {formatRelativeTime(entry.created_at)}
                    </Text>
                  </View>
                  <PointsEarnedPill
                    delta={entry.delta}
                    label={entry.delta > 0 ? 'pts' : 'pts'}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
