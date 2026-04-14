import React from 'react';
import { View, Text } from 'react-native';
import { cn, getTierColor, TRUST_TIER_ORDER } from '../utils';
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

export function TrustBadge({
  tier,
  score,
  showScore = false,
  size = 'md',
  className,
}: TrustBadgeProps) {
  const color = getTierColor(tier);
  const icon = TIER_ICONS[tier];

  return (
    <View
      className={cn(
        'flex-row items-center rounded-full px-3 py-1 border',
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
        className,
      )}
      style={{ borderColor: color, backgroundColor: `${color}18` }}
    >
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
  score: number; // 0–100
  tier: TrustTier;
  className?: string;
}

export function TrustScoreBar({ score, tier, className }: TrustScoreBarProps) {
  const color = getTierColor(tier);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <View className={cn('', className)}>
      <View className="flex-row justify-between mb-1">
        <Text className="text-text-secondary text-xs">Trust Score</Text>
        <Text className="text-text-primary text-xs font-semibold">{score}/100</Text>
      </View>
      <View className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}
