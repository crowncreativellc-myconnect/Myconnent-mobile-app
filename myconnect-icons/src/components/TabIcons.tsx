import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Polygon,
} from 'react-native-svg';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  blue: '#4F6EF7',
  green: '#10B981',
  gold: '#F6C90E',
  violet: '#7C3AED',
  inactive: '#4A5578',
} as const;

// ─── Shared Props ─────────────────────────────────────────────────────────────
interface IconProps {
  size?: number;
  active?: boolean;
  color?: string;
}

// ─── HOME ICON ────────────────────────────────────────────────────────────────
export function HomeIcon({ size = 28, active = false }: IconProps) {
  const stroke = active ? COLORS.blue : COLORS.inactive;
  const goldFill = active ? COLORS.gold : COLORS.inactive;
  const greenFill = active ? COLORS.green : COLORS.inactive;
  const opacity = active ? 1 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Arc roof — logo callback */}
      <Path
        d="M 4 14 Q 16 2 28 14"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={opacity}
      />
      {/* House body */}
      <Rect
        x="7"
        y="14"
        width="18"
        height="13"
        rx="1.5"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Door */}
      <Rect
        x="12"
        y="19"
        width="8"
        height="8"
        rx="1"
        stroke={stroke}
        strokeWidth={1.5}
        opacity={opacity}
      />
      {/* Gold apex node */}
      <Circle cx="16" cy="5" r="2.8" fill={goldFill} opacity={opacity} />
      {/* Blue left node */}
      <Circle cx="4" cy="14" r="2.5" fill={stroke} opacity={opacity} />
      {/* Green right node */}
      <Circle cx="28" cy="14" r="2.5" fill={greenFill} opacity={opacity} />
    </Svg>
  );
}

// ─── SHOUT OUT ICON ───────────────────────────────────────────────────────────
export function ShoutIcon({ size = 28, active = false }: IconProps) {
  const stroke = active ? COLORS.gold : COLORS.inactive;
  const blueFill = active ? COLORS.blue : COLORS.inactive;
  const opacity = active ? 1 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Speech bubble body */}
      <Rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="4"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Bubble tail */}
      <Path
        d="M 7 20 L 2 28 L 14 20"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={opacity}
      />
      {/* Three dots — message content */}
      <Circle cx="8" cy="12" r="2" fill={stroke} opacity={opacity} />
      <Circle cx="13" cy="12" r="2" fill={stroke} opacity={opacity} />
      <Circle cx="18" cy="12" r="2" fill={stroke} opacity={opacity} />
      {/* Signal arc — broadcasting */}
      <Path
        d="M 24 6 Q 29 11 29 16"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={active ? 0.7 : 0.35}
      />
      <Path
        d="M 27 3 Q 33 9 33 16"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 0.35 : 0.2}
      />
      {/* Gold origin node */}
      <Circle cx="22" cy="5" r="2.5" fill={stroke} opacity={opacity} />
      {/* Blue AI node */}
      <Circle cx="29" cy="16" r="2" fill={blueFill} opacity={opacity} />
    </Svg>
  );
}

// ─── MY CIRCLE ICON ───────────────────────────────────────────────────────────
export function CircleIcon({ size = 28, active = false }: IconProps) {
  const stroke = active ? COLORS.green : COLORS.inactive;
  const goldFill = active ? COLORS.gold : COLORS.inactive;
  const blueFill = active ? COLORS.blue : COLORS.inactive;
  const opacity = active ? 1 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Outer dashed trust ring */}
      <Circle
        cx="16"
        cy="16"
        r="13"
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={active ? 0.4 : 0.25}
      />
      {/* Arc connections */}
      <Path
        d="M 16 4 Q 27 10 26 22"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 0.6 : 0.3}
      />
      <Path
        d="M 26 22 Q 16 28 6 22"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 0.6 : 0.3}
      />
      <Path
        d="M 6 22 Q 5 10 16 4"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 0.6 : 0.3}
      />
      {/* Top node — you, gold */}
      <Circle cx="16" cy="4" r="3.5" fill={goldFill} opacity={opacity} />
      {/* Bottom right node — blue */}
      <Circle cx="26" cy="22" r="3.5" fill={blueFill} opacity={opacity} />
      {/* Bottom left node — green */}
      <Circle cx="6" cy="22" r="3.5" fill={stroke} opacity={opacity} />
      {/* Centre node */}
      <Circle cx="16" cy="16" r="3" fill={stroke} opacity={opacity} />
    </Svg>
  );
}

// ─── POINTS ICON ──────────────────────────────────────────────────────────────
export function PointsIcon({ size = 28, active = false }: IconProps) {
  const stroke = active ? COLORS.gold : COLORS.inactive;
  const blueFill = active ? COLORS.blue : COLORS.inactive;
  const violetFill = active ? COLORS.violet : COLORS.inactive;
  const greenFill = active ? COLORS.green : COLORS.inactive;
  const opacity = active ? 1 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Hexagon outline */}
      <Polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Rising arc — growth indicator */}
      <Path
        d="M 9 22 Q 12 12 16 9 Q 20 12 23 22"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={opacity}
      />
      {/* Peak node */}
      <Circle cx="16" cy="9" r="3" fill={stroke} opacity={opacity} />
      {/* Base nodes */}
      <Circle cx="9" cy="22" r="2.5" fill={stroke} opacity={active ? 0.6 : 0.3} />
      <Circle cx="23" cy="22" r="2.5" fill={stroke} opacity={active ? 0.6 : 0.3} />
      {/* Tier marker dots at hexagon vertices */}
      <Circle cx="16" cy="2" r="2" fill={blueFill} opacity={opacity} />
      <Circle cx="28" cy="9" r="2" fill={violetFill} opacity={opacity} />
      <Circle cx="28" cy="23" r="2" fill={greenFill} opacity={opacity} />
    </Svg>
  );
}

// ─── PROFILE ICON ─────────────────────────────────────────────────────────────
export function ProfileIcon({ size = 28, active = false }: IconProps) {
  const stroke = active ? COLORS.violet : COLORS.inactive;
  const goldFill = active ? COLORS.gold : COLORS.inactive;
  const opacity = active ? 1 : 0.45;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Head circle */}
      <Circle
        cx="16"
        cy="12"
        r="7"
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Shoulders arc */}
      <Path
        d="M 3 30 Q 3 21 16 19 Q 29 21 29 30"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={opacity}
      />
      {/* Trust halo arc */}
      <Path
        d="M 6 12 Q 5 1 16 0 Q 27 1 26 12"
        stroke={goldFill}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 1 : 0.3}
      />
      {/* Gold founding badge node at top */}
      <Circle cx="16" cy="0" r="3" fill={goldFill} opacity={opacity} />
      {/* Violet side nodes on halo */}
      <Circle cx="6" cy="12" r="2.5" fill={stroke} opacity={opacity} />
      <Circle cx="26" cy="12" r="2.5" fill={stroke} opacity={opacity} />
    </Svg>
  );
}

// ─── Tab Icon unified export ───────────────────────────────────────────────────

export type TabName = 'home' | 'shout' | 'circle' | 'points' | 'profile';

interface TabIconProps {
  tab: TabName;
  size?: number;
  active?: boolean;
}

export function TabIcon({ tab, size = 28, active = false }: TabIconProps) {
  switch (tab) {
    case 'home':    return <HomeIcon size={size} active={active} />;
    case 'shout':   return <ShoutIcon size={size} active={active} />;
    case 'circle':  return <CircleIcon size={size} active={active} />;
    case 'points':  return <PointsIcon size={size} active={active} />;
    case 'profile': return <ProfileIcon size={size} active={active} />;
  }
}
