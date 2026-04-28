import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Button } from './Button';
import { useReduceMotion } from '../utils';
import { useTheme } from '../hooks/useTheme';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const { colors } = useTheme();

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, floatAnim]);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
      <Animated.Text style={{ fontSize: 48, marginBottom: 16, transform: [{ translateY: floatAnim }] }}>
        {emoji}
      </Animated.Text>
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Inter-SemiBold', textAlign: 'center', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <View style={{ marginTop: 24 }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="md" />
        </View>
      )}
    </View>
  );
}
