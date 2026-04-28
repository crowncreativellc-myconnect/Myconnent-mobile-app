import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { TrustBadge } from './TrustBadge';
import { TrustPathCard } from './TrustPathCard';
import { cn, formatRelativeTime, formatSkillTag, URGENCY_LABELS, URGENCY_COLORS, useReduceMotion } from '../utils';
import { useTheme } from '../hooks/useTheme';
import { formatDegreeLabel } from '../lib/degreeMatching';
import type { MatchDegree, ShoutOut, TrustPathHop } from '../types';

const URGENCY_GRADIENTS: Record<string, readonly [string, string]> = {
  asap: ['#FF6B6B', '#EF4444'],
  urgent: ['#F59E0B', '#D97706'],
  routine: ['#10B981', '#059669'],
};

interface ShoutCardProps {
  shout: ShoutOut;
  onPress?: (shout: ShoutOut) => void;
  onAccept?: (shoutId: string) => void;
  onDelete?: (shoutId: string) => void;
  onOpenChat?: (shoutId: string) => void;
  isMatched?: boolean;
  isOwner?: boolean;
  index?: number;
  className?: string;
  /** Overrides `shout.match_degree` when supplied by the feed renderer. */
  matchDegree?: MatchDegree;
}

// ─── Degree colours for the matched indicator dot ─────────────────────────────
const DEGREE_DOT_COLOR: Record<MatchDegree, string> = {
  1: '#10B981',  // green  — in your circle
  2: '#4F6EF7',  // blue   — 2nd degree
  3: '#7C3AED',  // violet — premium (gated)
  4: '#7C3AED',
  5: '#7C3AED',
  6: '#7C3AED',
};

export function ShoutCard({
  shout,
  onPress,
  onAccept,
  onDelete,
  onOpenChat,
  isMatched = false,
  isOwner = false,
  index = 0,
  className,
  matchDegree,
}: ShoutCardProps) {
  const effectiveDegree: MatchDegree = matchDegree ?? shout.match_degree ?? 1;
  const trustPath: TrustPathHop[] = shout.trust_path ?? [];
  const firstHopName = trustPath[0]?.full_name ?? null;
  const degreeLabel = formatDegreeLabel(effectiveDegree);
  const degreeColor = DEGREE_DOT_COLOR[effectiveDegree];
  const author = shout.author;
  const urgencyColor = URGENCY_COLORS[shout.urgency];
  const urgencyLabel = URGENCY_LABELS[shout.urgency];
  const urgencyGradient = URGENCY_GRADIENTS[shout.urgency] ?? ['#10B981', '#059669'];
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    const delay = index * 50;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, index, fadeAnim, slideAnim]);

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.985,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress?.(shout)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Card
          variant={isMatched ? 'elevated' : 'bordered'}
          className={cn('overflow-hidden', className)}
          style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 }}
        >
          {/* Left accent border */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: urgencyColor,
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }}
          />

          <View style={{ padding: 16, paddingLeft: 19 }}>
            {/* Matched indicator — colour + label track the match degree */}
            {isMatched && (
              <View style={{ marginBottom: 12, marginTop: -4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: degreeColor,
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      color: degreeColor,
                      fontSize: 12,
                      fontFamily: 'Inter-SemiBold',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {effectiveDegree === 1 ? degreeLabel : `${degreeLabel} match`}
                  </Text>
                </View>
                {effectiveDegree >= 2 && firstHopName && (
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, marginLeft: 16 }}>
                    via {firstHopName}
                  </Text>
                )}
              </View>
            )}

            {/* Header */}
            <View className="flex-row items-start mb-3">
              {author && (
                <Avatar
                  name={author.full_name}
                  avatarUrl={author.avatar_url}
                  trustTier={author.trust_tier}
                  size="sm"
                  showTierRing
                />
              )}
              <View className="flex-1 ml-3">
                <View className="flex-row items-center flex-wrap gap-x-2">
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
                    {author?.full_name ?? 'Anonymous'}
                  </Text>
                  {author?.trust_tier && (
                    <TrustBadge tier={author.trust_tier} size="sm" />
                  )}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {author?.headline ?? 'Professional'} · {formatRelativeTime(shout.created_at)}
                </Text>
              </View>

              <View className="flex-row items-center gap-x-2">
                {/* Gradient urgency chip */}
                <View style={{ borderRadius: 999, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={urgencyGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 10, paddingVertical: 2 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Inter-SemiBold' }}>
                      {urgencyLabel}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Owner delete menu */}
                {isOwner && onDelete && (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() =>
                      Alert.alert(
                        'Delete Broadcast',
                        'This broadcast will be removed from your circle. This cannot be undone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => onDelete(shout.id),
                          },
                        ],
                      )
                    }
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 18 }}>⋯</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Shout text */}
            <Text style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24, marginBottom: 12 }}>
              {shout.draft_text}
            </Text>

            {/* Skill tags */}
            {shout.skill_tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-3">
                {shout.skill_tags.slice(0, 5).map((tag) => (
                  <View
                    key={tag}
                    className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-1"
                  >
                    <Text style={{ color: '#4F6EF7', fontSize: 12, fontFamily: 'Inter-Medium' }}>
                      {formatSkillTag(tag)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Compact trust path row — only renders when the path crosses at
                least one bridge contact. Kept subtle: 20px avatars, muted
                colour, small font. */}
            {trustPath.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginRight: 6 }}>You</Text>
                {trustPath.map((hop, i) => (
                  <View key={hop.user_id ?? `${hop.full_name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginHorizontal: 4 }}>→</Text>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: colors.bgCard,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 4,
                      }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 9, fontFamily: 'Inter-SemiBold' }}>
                        {hop.full_name
                          .split(' ')
                          .map((s) => s[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{hop.full_name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View className="flex-row items-center justify-between">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {shout.format !== 'async' && (
                  <>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' }}>
                      {shout.format.replace('_', ' ')}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>·</Text>
                  </>
                )}
                <Text style={{ color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' }}>
                  {shout.complexity.replace('_', ' ')}
                </Text>
              </View>

              {isMatched && onAccept && shout.status === 'active' && !shout.chat?.is_active && (
                <TouchableOpacity
                  onPress={() => onAccept(shout.id)}
                  className="bg-brand-accent rounded-xl px-4 py-1.5"
                >
                  <Text className="text-white text-sm font-semibold">Respond</Text>
                </TouchableOpacity>
              )}
              {shout.chat?.is_active && onOpenChat && (
                <TouchableOpacity
                  onPress={() => onOpenChat(shout.id)}
                  style={{
                    backgroundColor: '#4F6EF7',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter-SemiBold' }}>
                    {isOwner ? 'Open Chat' : 'Continue Chat'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2nd-degree trust path */}
            {shout.second_degree_match?.is_second_degree && (
              <TrustPathCard match={shout.second_degree_match} />
            )}
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}
