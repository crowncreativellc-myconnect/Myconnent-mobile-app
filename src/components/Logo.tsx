import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Polygon,
} from 'react-native-svg';

interface LogoMarkProps {
  size?: number;
}

/** Icon-only arc bridge mark */
export function LogoMark({ size = 40 }: LogoMarkProps) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 100 60">
      <Defs>
        <LinearGradient id="arcG" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#4F6EF7" />
          <Stop offset="50%" stopColor="#7C3AED" />
          <Stop offset="100%" stopColor="#4F6EF7" />
        </LinearGradient>
        <LinearGradient id="sparkG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#F7D03C" />
          <Stop offset="100%" stopColor="#F6C90E" />
        </LinearGradient>
      </Defs>

      {/* Glow arc */}
      <Path
        d="M 23,46 Q 50,6 77,46"
        fill="none"
        stroke="rgba(124,58,237,0.18)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* Main arc */}
      <Path
        d="M 23,46 Q 50,6 77,46"
        fill="none"
        stroke="url(#arcG)"
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {/* Trust dots along arc */}
      <Circle cx={36} cy={22} r={1.8} fill="rgba(79,110,247,0.7)" />
      <Circle cx={50} cy={10} r={1.8} fill="rgba(124,58,237,0.7)" />
      <Circle cx={64} cy={22} r={1.8} fill="rgba(79,110,247,0.7)" />

      {/* Left node ring + fill */}
      <Circle cx={23} cy={46} r={9} fill="rgba(79,110,247,0.12)" stroke="rgba(79,110,247,0.5)" strokeWidth={1} />
      <Circle cx={23} cy={46} r={5} fill="#4F6EF7" />
      <Circle cx={23} cy={44} r={1.6} fill="white" />
      <Path d="M 20,48 Q 23,50 26,48" fill="none" stroke="white" strokeWidth={0.9} strokeLinecap="round" />

      {/* Right node ring + fill */}
      <Circle cx={77} cy={46} r={9} fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.5)" strokeWidth={1} />
      <Circle cx={77} cy={46} r={5} fill="#10B981" />
      <Circle cx={77} cy={44} r={1.6} fill="white" />
      <Path d="M 74,48 Q 77,50 80,48" fill="none" stroke="white" strokeWidth={0.9} strokeLinecap="round" />

      {/* AI spark */}
      <Circle cx={50} cy={14} r={6} fill="url(#sparkG)" stroke="rgba(247,208,60,0.4)" strokeWidth={1} />
      <Polygon points="50,10 51,13 54,13 51.5,15 52.5,18 50,16 47.5,18 48.5,15 46,13 49,13" fill="#1A1508" />
    </Svg>
  );
}

interface LogoProps {
  /** 'full' = icon + wordmark + tagline, 'compact' = icon + wordmark only, 'mark' = icon only */
  variant?: 'full' | 'compact' | 'mark';
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { mark: 32, wordmark: 18, tagline: 9, gap: 6 },
  md: { mark: 44, wordmark: 24, tagline: 11, gap: 8 },
  lg: { mark: 56, wordmark: 30, tagline: 12, gap: 10 },
};

export function Logo({ variant = 'compact', size = 'md' }: LogoProps) {
  const dims = SIZE_MAP[size];
  const { colors } = useTheme();

  if (variant === 'mark') {
    return <LogoMark size={dims.mark} />;
  }

  return (
    <View style={{ alignItems: 'center', gap: dims.gap / 2 }}>
      <LogoMark size={dims.mark} />
      <Text
        style={{
          fontSize: dims.wordmark,
          fontFamily: 'Inter-Bold',
          letterSpacing: -0.5,
          color: colors.textPrimary,
        }}
      >
        My
        <Text style={{ color: '#4F6EF7' }}>Konnect</Text>
      </Text>
      {variant === 'full' && (
        <Text
          style={{
            fontSize: dims.tagline,
            color: colors.textMuted,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Hired through a friend, not a stranger
        </Text>
      )}
    </View>
  );
}
