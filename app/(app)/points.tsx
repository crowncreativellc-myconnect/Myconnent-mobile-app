import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PointsEarnedPill } from '../../src/components/KonnectPointsBadge';
import { PointsIcon } from '../../src/components/PointsIcons';
import type { PointsIconType } from '../../src/components/PointsIcons';
import { TrustBadge, TrustScoreBar } from '../../src/components/TrustBadge';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { PointsIcon as PointsTabIcon } from '../../src/components/TabIcons';
import { useSession } from '../../src/hooks/useSession';
import { formatRelativeTime, useReduceMotion } from '../../src/utils';
import { useTheme } from '../../src/hooks/useTheme';
import type { PointsLedgerEntry, TrustTier } from '../../src/types';

const STUB_LEDGER: PointsLedgerEntry[] = [
  { id: 'l1', user_id: 'me', event_type: 'completion', delta: 50, balance_after: 340, reference_id: 'shout-1', description: 'Completed: Contract review for Marcus Webb', created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 'l2', user_id: 'me', event_type: 'strong_review', delta: 20, balance_after: 290, reference_id: 'review-1', description: 'Received 5-star review from Marcus Webb', created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'l3', user_id: 'me', event_type: 'fast_response', delta: 5, balance_after: 270, reference_id: 'shout-2', description: 'Fast response bonus — responded within 1 hour', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 'l4', user_id: 'me', event_type: 'streak_bonus', delta: 40, balance_after: 265, reference_id: null, description: 'Monthly streak bonus — 3 completions this month', created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: 'l5', user_id: 'me', event_type: 'referral_completion', delta: 30, balance_after: 225, reference_id: 'ref-1', description: 'Referral bonus — Alex Kimura completed first job', created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
];

const TIER_THRESHOLDS: { tier: TrustTier; minPoints: number; label: string }[] = [
  { tier: 'Member', minPoints: 0, label: '0 pts' },
  { tier: 'Connector', minPoints: 100, label: '100 pts' },
  { tier: 'Trusted', minPoints: 300, label: '300 pts' },
  { tier: 'Founding', minPoints: 700, label: '700 pts' },
];

const EARN_WAYS: { iconType: PointsIconType; label: string; points: string }[] = [
  { iconType: 'complete_job', label: 'Complete a job', points: '+50 pts' },
  { iconType: 'strong_review', label: 'Receive a strong review (4+ stars + written)', points: '+20 pts' },
  { iconType: 'referral', label: 'Successful referral completes first job', points: '+30 pts' },
  { iconType: 'fast_response', label: 'Fast response to a matched shout-out', points: '+5 pts' },
  { iconType: 'monthly_streak', label: 'Monthly streak bonus (3 completions)', points: '+40 pts' },
];

function AnimatedLedgerEntry({ entry, index }: { entry: PointsLedgerEntry; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, index, fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, marginBottom: 12 }}>
      <Card variant="bordered">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Inter-Medium' }}>
              {entry.description}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {formatRelativeTime(entry.created_at)}
            </Text>
          </View>
          <PointsEarnedPill delta={entry.delta} label="pts" />
        </View>
      </Card>
    </Animated.View>
  );
}

export default function PointsScreen() {
  const { profile } = useSession();
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();
  const points = profile?.konnect_points ?? 0;
  const tier = profile?.trust_tier ?? 'Member';
  const trustScore = profile?.trust_score ?? 0;

  // Count-up animation
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayPoints(points);
      return;
    }
    const listener = countAnim.addListener(({ value }) => setDisplayPoints(Math.floor(value)));
    Animated.timing(countAnim, {
      toValue: points,
      duration: 800,
      useNativeDriver: false,
    }).start();
    return () => countAnim.removeListener(listener);
  }, [points, reduceMotion, countAnim]);

  const currentIdx = TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
  const nextTier = TIER_THRESHOLDS[currentIdx + 1];
  const progressToNext = nextTier
    ? Math.min(1, (points - TIER_THRESHOLDS[currentIdx]!.minPoints) / (nextTier.minPoints - TIER_THRESHOLDS[currentIdx]!.minPoints))
    : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Konnect Points" titleIcon={<PointsTabIcon size={40} active />} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Points hero — dark warm gold gradient */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 20 }}>
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#F6C90E',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <LinearGradient
              colors={colors.gradientGold}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}
            >
              {/* Points count-up */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: colors.goldTrack,
                  borderWidth: 1,
                  borderColor: colors.goldSubText,
                  borderRadius: 999,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.goldText, fontSize: 28, fontFamily: 'Inter-Bold' }}>
                  ⬡ {displayPoints}
                </Text>
                <Text style={{ color: colors.goldSubText, fontSize: 16 }}>pts</Text>
              </View>

              <TrustBadge tier={tier} score={trustScore} showScore />

              {nextTier ? (
                <View style={{ width: '100%', marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.goldSubText, fontSize: 12 }}>{tier}</Text>
                    <Text style={{ color: colors.goldSubText, fontSize: 12 }}>
                      {nextTier.tier} at {nextTier.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8, backgroundColor: colors.goldTrack,
                      borderRadius: 999, overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={['#F7D03C', '#F6C90E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ width: `${progressToNext * 100}%`, height: '100%', borderRadius: 999 }}
                    />
                  </View>
                  <Text style={{ color: colors.goldSubText, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                    {nextTier.minPoints - points} pts to {nextTier.tier}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: '#F6C90E', fontSize: 14, fontFamily: 'Inter-SemiBold', marginTop: 16 }}>
                  🏆 Maximum tier achieved — Founding Member
                </Text>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Trust score bar */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Card variant="bordered">
            <TrustScoreBar score={trustScore} tier={tier} />
          </Card>
        </View>

        {/* How to earn */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 12 }}>
            How to earn
          </Text>
          <Card variant="bordered">
            {EARN_WAYS.map((way, idx) => (
              <View
                key={way.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: idx < EARN_WAYS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <PointsIcon type={way.iconType} size={44} />
                <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14, marginLeft: 12 }}>{way.label}</Text>
                <Text style={{ color: '#10B981', fontSize: 14, fontFamily: 'Inter-Bold' }}>{way.points}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Ledger — staggered entries */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 12 }}>
            Recent activity
          </Text>
          {STUB_LEDGER.map((entry, index) => (
            <AnimatedLedgerEntry key={entry.id} entry={entry} index={index} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

