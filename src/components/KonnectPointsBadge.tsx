import React from 'react';
import { View, Text } from 'react-native';
import { cn, formatPoints } from '../utils';
import { useTheme } from '../hooks/useTheme';

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
  const { colors } = useTheme();
  const px = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const py = size === 'sm' ? 2 : size === 'lg' ? 8 : 4;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 20 : 13;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        backgroundColor: colors.goldTrack,
        borderWidth: 1,
        borderColor: colors.goldSubText,
        paddingHorizontal: px,
        paddingVertical: py,
      }}
    >
      <Text style={{ color: colors.goldText, fontFamily: 'Inter-Bold', fontSize }}>
        ⬡ {formatPoints(points)}
      </Text>
      {showLabel && (
        <Text style={{ color: colors.goldSubText, fontSize, marginLeft: 4 }}>
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
