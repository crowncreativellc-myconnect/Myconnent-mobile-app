import React, { useRef, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
  Animated,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { cn } from '../utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  className?: string;
}

const GRADIENTS: Partial<Record<ButtonVariant, readonly [string, string, ...string[]]>> = {
  primary: ['#5B7CFA', '#4F6EF7', '#4460E8'],
  secondary: ['#1E2447', '#1A2040'],
  gold: ['#F7D03C', '#F6C90E', '#E8B800'],
};

const FLAT_STYLES: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand-primary border border-brand-primary',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-surface-elevated border border-surface-border',
    text: 'text-text-primary font-semibold',
  },
  ghost: {
    container: 'bg-transparent border border-transparent',
    text: 'text-brand-primary font-semibold',
  },
  danger: {
    container: 'bg-brand-danger border border-brand-danger',
    text: 'text-white font-semibold',
  },
  gold: {
    container: 'bg-konnect-gold border border-konnect-gold',
    text: 'text-surface font-bold',
  },
};

const SIZE_STYLES: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2 rounded-xl', text: 'text-sm' },
  md: { container: 'px-6 py-3.5 rounded-2xl', text: 'text-base' },
  lg: { container: 'px-8 py-4 rounded-2xl', text: 'text-lg' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  haptic = true,
  disabled,
  className,
  onPress,
  ...rest
}: ButtonProps) {
  const sizeStyle = SIZE_STYLES[size];
  const flatStyle = FLAT_STYLES[variant];
  const isDisabled = disabled || isLoading;
  const gradient = GRADIENTS[variant];

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const animateIn = () => {
    if (isDisabled || reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    if (reduceMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress: TouchableOpacityProps['onPress'] = (e) => {
    if (haptic && !isDisabled) {
      const style =
        variant === 'gold'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    }
    onPress?.(e!);
  };

  const indicatorColor =
    variant === 'primary' || variant === 'danger' || variant === 'gold'
      ? '#ffffff'
      : '#4F6EF7';

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth ? { alignSelf: 'stretch' } : {},
      ]}
    >
      <TouchableOpacity
        disabled={isDisabled}
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={handlePress}
        activeOpacity={gradient ? 0.9 : 0.75}
        style={{ overflow: 'hidden' }}
        className={cn(
          'flex-row items-center justify-center',
          !gradient && flatStyle.container,
          sizeStyle.container,
          fullWidth && 'w-full',
          isDisabled && 'opacity-35',
          className,
        )}
        {...rest}
      >
        {gradient && (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {isLoading ? (
          <ActivityIndicator size="small" color={indicatorColor} />
        ) : (
          <>
            {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
            <Text className={cn(flatStyle.text, sizeStyle.text)}>{label}</Text>
            {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
