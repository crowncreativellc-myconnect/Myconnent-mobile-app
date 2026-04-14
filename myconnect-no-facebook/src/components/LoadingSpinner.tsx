import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../utils';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerVariant = 'default' | 'overlay' | 'inline';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  color?: string;
  className?: string;
}

const SIZE_MAP: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  label,
  color = '#4F6EF7',
  className,
}: LoadingSpinnerProps) {
  if (variant === 'overlay') {
    return (
      <View className="absolute inset-0 items-center justify-center bg-surface/80 z-50">
        <View className="bg-surface-elevated rounded-2xl p-6 items-center">
          <ActivityIndicator size={SIZE_MAP[size]} color={color} />
          {label && (
            <Text className="text-text-secondary text-sm mt-3">{label}</Text>
          )}
        </View>
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View className={cn('flex-row items-center', className)}>
        <ActivityIndicator size={SIZE_MAP[size]} color={color} />
        {label && (
          <Text className="text-text-secondary text-sm ml-2">{label}</Text>
        )}
      </View>
    );
  }

  return (
    <View className={cn('flex-1 items-center justify-center', className)}>
      <ActivityIndicator size={SIZE_MAP[size]} color={color} />
      {label && (
        <Text className="text-text-secondary text-sm mt-3">{label}</Text>
      )}
    </View>
  );
}
