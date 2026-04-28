import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn, getTierColor, useReduceMotion } from '../utils';
import { useTheme } from '../hooks/useTheme';
import type { TrustTier } from '../types';

interface TrustBadgeProps {
  tier: TrustTier;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const TIER_ICONS: Record<TrustTier, string> = {
  Member: '●',
  Connector: '◆',
  Trusted: '★',
  Founding: '⬡',
};

const TIER_GRADIENTS: Record<TrustTier, readonly [string, string]> = {
  Member: ['#1E2535', '#1A2230'],
  Connector: ['#1A2447', '#152040'],
  Trusted: ['#1E1A47', '#1A1540'],
  Founding: ['#2A2010', '#241A08'],
};

export function TrustBadge({
  tier,
  score,
  showScore = false,
  size = 'md',
  className,
}: TrustBadgeProps) {
  const color = getTierColor(tier);
  const icon = TIER_ICONS[tier];
  const gradient = TIER_GRADIENTS[tier];
  const shimmerAnim = useRef(new Animated.Value(-80)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (tier !== 'Founding' || reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 200,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(shimmerAnim, {
          toValue: -80,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [tier, reduceMotion, shimmerAnim]);

  const px = size === 'sm' ? 8 : 12;
  const py = size === 'sm' ? 2 : 4;
  const borderRadius = 999;

  return (
    <View
      className={cn('flex-row items-center overflow-hidden', className)}
      style={{
        borderWidth: 1,
        borderColor: color,
        borderRadius,
        paddingHorizontal: px,
        paddingVertical: py,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Founding shimmer overlay */}
      {tier === 'Founding' && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateX: shimmerAnim }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 80, height: '100%' }}
          />
        </Animated.View>
      )}

      <Text style={{ color, fontSize: size === 'sm' ? 8 : 10 }}>{icon} </Text>
      <Text
        className={cn('font-semibold', size === 'sm' ? 'text-xs' : 'text-sm')}
        style={{ color }}
      >
        {tier}
      </Text>
      {showScore && score !== undefined && (
        <Text
          className={cn('ml-1 font-normal', size === 'sm' ? 'text-xs' : 'text-sm')}
          style={{ color }}
        >
          · {score}
        </Text>
      )}
    </View>
  );
}

// ─── Trust Score Bar ──────────────────────────────────────────────────────────

interface TrustScoreBarProps {
  score: number;
  tier: TrustTier;
  className?: string;
}

export function TrustScoreBar({ score, tier, className }: TrustScoreBarProps) {
  const color = getTierColor(tier);
  const { colors } = useTheme();
  const pct = Math.min(100, Math.max(0, score));

  return (
    <View className={cn('', className)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Trust Score</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 12, fontFamily: 'Inter-SemiBold' }}>{score}/100</Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.bgElevated, borderRadius: 999, overflow: 'hidden' }}>
        <LinearGradient
          colors={[color, `${color}99`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
        />
      </View>
    </View>
  );
}
