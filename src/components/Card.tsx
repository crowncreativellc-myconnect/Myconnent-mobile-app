import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '../utils';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'ghost';

interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: 'bg-surface-card rounded-2xl p-4',
  elevated: 'bg-surface-elevated rounded-2xl p-4 shadow-lg',
  bordered: 'bg-surface-card rounded-2xl p-4 border border-surface-border',
  ghost: 'bg-transparent rounded-2xl p-4',
};

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <View className={cn(VARIANT_STYLES[variant], className)} {...props}>
      {children}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <View className={cn('mb-3', className)}>
      {children}
    </View>
  );
}

export function CardContent({ children, className }: CardHeaderProps) {
  return (
    <View className={cn('', className)}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className }: CardHeaderProps) {
  return (
    <View className={cn('mt-3 pt-3 border-t border-surface-border', className)}>
      {children}
    </View>
  );
}
