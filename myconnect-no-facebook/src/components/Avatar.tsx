import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn, getInitials, getTierColor } from '../utils';
import type { TrustTier } from '../types';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  trustTier?: TrustTier;
  size?: AvatarSize;
  showTierRing?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<
  AvatarSize,
  { container: string; image: number; text: string }
> = {
  xs: { container: 'w-8 h-8 rounded-full', image: 32, text: 'text-xs font-semibold' },
  sm: { container: 'w-10 h-10 rounded-full', image: 40, text: 'text-sm font-semibold' },
  md: { container: 'w-12 h-12 rounded-full', image: 48, text: 'text-base font-bold' },
  lg: { container: 'w-16 h-16 rounded-full', image: 64, text: 'text-xl font-bold' },
  xl: { container: 'w-24 h-24 rounded-full', image: 96, text: 'text-3xl font-bold' },
};

const RING_WIDTH: Record<AvatarSize, number> = {
  xs: 1.5,
  sm: 2,
  md: 2,
  lg: 2.5,
  xl: 3,
};

export function Avatar({
  name,
  avatarUrl,
  trustTier = 'Member',
  size = 'md',
  showTierRing = false,
  className,
}: AvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(name);
  const tierColor = getTierColor(trustTier);
  const ringWidth = RING_WIDTH[size];

  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      className={config.container}
      style={{ width: config.image, height: config.image, borderRadius: config.image / 2 }}
      resizeMode="cover"
    />
  ) : (
    <View
      className={cn('items-center justify-center bg-surface-elevated', config.container)}
      style={{ width: config.image, height: config.image, borderRadius: config.image / 2 }}
    >
      <Text className={cn('text-brand-primary', config.text)}>{initials}</Text>
    </View>
  );

  if (!showTierRing) {
    return <View className={cn(className)}>{inner}</View>;
  }

  return (
    <View
      className={cn('items-center justify-center', className)}
      style={{
        width: config.image + ringWidth * 2 + 4,
        height: config.image + ringWidth * 2 + 4,
        borderRadius: (config.image + ringWidth * 2 + 4) / 2,
        borderWidth: ringWidth,
        borderColor: tierColor,
        padding: 2,
      }}
    >
      {inner}
    </View>
  );
}

// ─── Avatar Group (stacked) ───────────────────────────────────────────────────

interface AvatarGroupProps {
  users: Array<{ name: string; avatarUrl?: string | null }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const config = SIZE_CONFIG[size];
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const overlap = Math.round(config.image * 0.3);

  return (
    <View className="flex-row items-center">
      {visible.map((user, idx) => (
        <View
          key={`${user.name}-${idx}`}
          style={{
            marginLeft: idx === 0 ? 0 : -overlap,
            zIndex: visible.length - idx,
          }}
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          className="items-center justify-center bg-surface-elevated border border-surface-border"
          style={{
            width: config.image,
            height: config.image,
            borderRadius: config.image / 2,
            marginLeft: -overlap,
          }}
        >
          <Text className={cn('text-text-secondary', config.text)}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
