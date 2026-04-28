import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils';
import { useTheme } from '../hooks/useTheme';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'ghost';
type GlowType = 'primary' | 'gold' | 'accent' | null;

interface CardProps extends ViewProps {
  variant?: CardVariant;
  glow?: GlowType;
  className?: string;
  children: React.ReactNode;
}

const GLOW_SHADOW: Record<NonNullable<GlowType>, object> = {
  primary: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  gold: {
    shadowColor: '#F6C90E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  accent: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};

export function Card({
  variant = 'default',
  glow = null,
  className,
  children,
  style,
  ...props
}: CardProps) {
  const { colors } = useTheme();
  const glowStyle = glow ? GLOW_SHADOW[glow] : {};

  if (variant === 'elevated') {
    return (
      <View
        style={[styles.elevated, glowStyle, style]}
        className={cn('rounded-2xl overflow-hidden', className)}
        {...props}
      >
        <LinearGradient
          colors={colors.gradientElevated}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.glassHighlight,
          }}
        />
        <View style={{ padding: 16 }}>{children}</View>
      </View>
    );
  }

  if (variant === 'bordered') {
    return (
      <View
        style={[
          { backgroundColor: colors.bgCard, borderColor: colors.borderGlass },
          styles.bordered,
          glowStyle,
          style,
        ]}
        className={cn('rounded-2xl p-4', className)}
        {...props}
      >
        {children}
      </View>
    );
  }

  if (variant === 'ghost') {
    return (
      <View
        className={cn('bg-transparent rounded-2xl p-4', className)}
        style={style}
        {...props}
      >
        {children}
      </View>
    );
  }

  // default
  return (
    <View
      style={[{ backgroundColor: colors.bgCard }, styles.default, glowStyle, style]}
      className={cn('rounded-2xl p-4 overflow-hidden', className)}
      {...props}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: colors.glassHighlight,
        }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bordered: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardSectionProps) {
  return <View className={cn('mb-3', className)}>{children}</View>;
}

export function CardContent({ children, className }: CardSectionProps) {
  return <View className={cn('', className)}>{children}</View>;
}

export function CardFooter({ children, className }: CardSectionProps) {
  return (
    <View className={cn('mt-3 pt-3 border-t border-surface-border', className)}>
      {children}
    </View>
  );
}
