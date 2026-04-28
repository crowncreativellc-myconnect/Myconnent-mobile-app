import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated } from 'react-native';
import { cn, getInitials, getTierColor, useReduceMotion } from '../utils';
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
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  const reduceMotion = useReduceMotion();
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever the URL changes so a new upload is always retried
  useEffect(() => { setImgError(false); }, [avatarUrl]);

  const shouldPulse =
    showTierRing && (trustTier === 'Trusted' || trustTier === 'Founding');

  useEffect(() => {
    if (!shouldPulse || reduceMotion) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shouldPulse, reduceMotion, pulseAnim]);

  const showImage = !!avatarUrl && !imgError;

  const inner = showImage ? (
    <Image
      key={avatarUrl}
      source={{ uri: avatarUrl }}
      style={{ width: config.image, height: config.image, borderRadius: config.image / 2 }}
      resizeMode="cover"
      onError={() => setImgError(true)}
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

  const totalSize = config.image + ringWidth * 2 + 4;

  return (
    <Animated.View
      className={cn('items-center justify-center', className)}
      style={{
        width: totalSize,
        height: totalSize,
        borderRadius: totalSize / 2,
        borderWidth: ringWidth,
        borderColor: tierColor,
        padding: 2,
        opacity: pulseAnim,
      }}
    >
      {inner}
    </Animated.View>
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
