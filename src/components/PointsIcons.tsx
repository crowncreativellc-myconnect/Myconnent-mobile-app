import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Polygon, Line } from 'react-native-svg';

export type PointsIconType = 'complete_job' | 'strong_review' | 'referral' | 'fast_response' | 'monthly_streak';

const BG_COLORS: Record<PointsIconType, string> = {
  complete_job: 'rgba(16,185,129,0.12)',
  strong_review: 'rgba(246,201,14,0.12)',
  referral: 'rgba(79,110,247,0.12)',
  fast_response: 'rgba(246,201,14,0.12)',
  monthly_streak: 'rgba(239,68,68,0.12)',
};

const BORDER_COLORS: Record<PointsIconType, string> = {
  complete_job: 'rgba(16,185,129,0.25)',
  strong_review: 'rgba(246,201,14,0.25)',
  referral: 'rgba(79,110,247,0.25)',
  fast_response: 'rgba(246,201,14,0.25)',
  monthly_streak: 'rgba(239,68,68,0.25)',
};

export function CompleteJobIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="12" stroke="#10B981" strokeWidth="2" fill="none" opacity={0.3} />
      <Path d="M 16,4 A 12,12 0 1,1 7.5,23.4" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M 10,16 L 14,20 L 22,10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="7.5" cy="23.4" r="3" fill="#F6C90E" />
    </Svg>
  );
}

export function StrongReviewIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Polygon
        points="16,3 18.9,11.2 27.6,11.2 20.9,16.3 23.4,24.5 16,19.8 8.6,24.5 11.1,16.3 4.4,11.2 13.1,11.2"
        stroke="#F6C90E"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <Polygon
        points="16,7 17.6,12 22.6,12 18.7,14.8 20,19.8 16,17 12,19.8 13.3,14.8 9.4,12 14.4,12"
        fill="#F6C90E"
        opacity={0.2}
      />
      <Path d="M 6,27 Q 16,32 26,27" stroke="#F6C90E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Circle cx="6" cy="27" r="2.5" fill="#4F6EF7" />
      <Circle cx="26" cy="27" r="2.5" fill="#4F6EF7" />
    </Svg>
  );
}

export function ReferralIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M 5,22 Q 16,2 27,22" stroke="#4F6EF7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Circle cx="5" cy="22" r="5" fill="#4F6EF7" />
      <Circle cx="5" cy="20" r="2" fill="rgba(255,255,255,0.6)" />
      <Path d="M 2,24 Q 5,26 8,24" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <Circle cx="27" cy="22" r="5" fill="#10B981" />
      <Circle cx="27" cy="20" r="2" fill="rgba(255,255,255,0.6)" />
      <Path d="M 24,24 Q 27,26 30,24" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <Circle cx="16" cy="6" r="5" fill="#F6C90E" />
      <Path d="M 13.5,6 L 15.5,8 L 19,4" stroke="#1A1508" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function FastResponseIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="12" stroke="#F6C90E" strokeWidth="1.5" fill="none" opacity={0.3} />
      <Path d="M 16,4 A 12,12 0 0,1 26,10" stroke="#F6C90E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Line x1="16" y1="16" x2="21" y2="8" stroke="#F6C90E" strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="16" x2="22" y2="18" stroke="rgba(246,201,14,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 18,4 L 13,15 L 17,15 L 12,26 L 19,13 L 15,13 Z" fill="#F6C90E" />
      <Circle cx="16" cy="16" r="2" fill="#F6C90E" />
    </Svg>
  );
}

export function MonthlyStreakIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M 4,24 Q 9,12 14,20" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Circle cx="4" cy="24" r="2.5" fill="rgba(79,110,247,0.7)" />
      <Circle cx="14" cy="20" r="2.5" fill="rgba(246,201,14,0.7)" />
      <Path d="M 12,22 Q 16,10 20,22" stroke="rgba(239,68,68,0.65)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Circle cx="12" cy="22" r="3" fill="rgba(16,185,129,0.8)" />
      <Circle cx="20" cy="22" r="3" fill="rgba(246,201,14,0.8)" />
      <Path d="M 18,20 Q 23,8 28,20" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Circle cx="18" cy="20" r="3" fill="#4F6EF7" />
      <Circle cx="28" cy="20" r="3" fill="#F6C90E" />
      <Circle cx="9" cy="14" r="2.5" fill="rgba(246,201,14,0.5)" />
      <Circle cx="16" cy="12" r="3" fill="rgba(246,201,14,0.75)" />
      <Circle cx="23" cy="10" r="3.5" fill="#F6C90E" />
      <Path d="M 23,6 Q 25,2 23,0 Q 28,3 26,8 Q 29,5 28,1 Q 32,6 29,10 Q 27,13 23,11 Q 19,13 17,10 Q 14,6 18,1 Q 17,5 20,8 Q 18,3 23,6 Z" fill="#EF4444" opacity={0.85} />
      <Path d="M 23,7 Q 24,4 23,2 Q 26,5 25,7 Q 26,5 25,3 Q 28,6 26,9 Q 25,11 23,10 Q 21,11 20,9 Q 18,6 21,3 Q 20,5 22,7 Z" fill="#F6C90E" opacity={0.9} />
    </Svg>
  );
}

const ICON_MAP: Record<PointsIconType, React.ComponentType<{ size?: number }>> = {
  complete_job: CompleteJobIcon,
  strong_review: StrongReviewIcon,
  referral: ReferralIcon,
  fast_response: FastResponseIcon,
  monthly_streak: MonthlyStreakIcon,
};

interface PointsIconProps {
  type: PointsIconType;
  size?: number;
  showBackground?: boolean;
}

export function PointsIcon({ type, size = 32, showBackground = true }: PointsIconProps) {
  const IconComponent = ICON_MAP[type];
  if (!showBackground) {
    return <IconComponent size={size} />;
  }
  const padding = Math.round(size * 0.2);
  const containerSize = size + padding * 2;
  const borderRadius = Math.round(containerSize * 0.28);
  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius,
        backgroundColor: BG_COLORS[type],
        borderWidth: 1,
        borderColor: BORDER_COLORS[type],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconComponent size={size} />
    </View>
  );
}
