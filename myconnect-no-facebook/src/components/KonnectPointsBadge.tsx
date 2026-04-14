import React from 'react';
import { View, Text } from 'react-native';
import { cn, formatPoints } from '../utils';

interface KonnectPointsBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function KonnectPointsBadge({
  points,
  size = 'md',
  showLabel = true,
  className,
}: KonnectPointsBadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center rounded-full bg-konnect-gold/10 border border-konnect-gold/30',
        size === 'sm' ? 'px-2 py-0.5' : size === 'lg' ? 'px-4 py-2' : 'px-3 py-1',
        className,
      )}
    >
      <Text
        className={cn(
          'text-konnect-gold font-bold',
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm',
        )}
      >
        ⬡ {formatPoints(points)}
      </Text>
      {showLabel && (
        <Text
          className={cn(
            'text-konnect-gold/70 ml-1',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
          )}
        >
          pts
        </Text>
      )}
    </View>
  );
}

// ─── Points Earned Pill (for toasts / confirmations) ──────────────────────────

interface PointsEarnedPillProps {
  delta: number;
  label: string;
  className?: string;
}

export function PointsEarnedPill({ delta, label, className }: PointsEarnedPillProps) {
  const isPositive = delta > 0;
  return (
    <View
      className={cn(
        'flex-row items-center rounded-full px-3 py-1.5',
        isPositive ? 'bg-brand-accent/10 border border-brand-accent/30' : 'bg-brand-danger/10 border border-brand-danger/30',
        className,
      )}
    >
      <Text
        className={cn(
          'text-sm font-bold mr-1.5',
          isPositive ? 'text-brand-accent' : 'text-brand-danger',
        )}
      >
        {isPositive ? `+${delta}` : delta}
      </Text>
      <Text className="text-text-secondary text-sm">{label}</Text>
    </View>
  );
}
