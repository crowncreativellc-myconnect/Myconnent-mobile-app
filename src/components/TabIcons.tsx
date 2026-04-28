import React from 'react';
import Svg, { Path, Rect, Circle, Polygon } from 'react-native-svg';
import { ShoutIcon } from './ShoutIcon';

const MUTED = '#4A5578';

interface IconProps {
  size?: number;
  active?: boolean;
}

export function HomeIcon({ size = 28, active = false }: IconProps) {
  const arc = active ? '#4F6EF7' : MUTED;
  const spark = active ? '#F6C90E' : MUTED;
  const right = active ? '#10B981' : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M 4 14 Q 16 2 28 14" stroke={arc} strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={7} y={14} width={18} height={13} rx={1.5} stroke={arc} strokeWidth={2} />
      <Rect x={12} y={19} width={8} height={8} rx={1} stroke={arc} strokeWidth={1.5} />
      <Circle cx={16} cy={5} r={2.8} fill={spark} />
      <Circle cx={4} cy={14} r={2.5} fill={arc} />
      <Circle cx={28} cy={14} r={2.5} fill={right} />
    </Svg>
  );
}

export { ShoutIcon };

export function ShoutFabIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 32" fill="none">
      {/* Megaphone body */}
      <Rect x={1} y={3} width={22} height={17} rx={4.5} stroke="#F6C90E" strokeWidth={2.5} />
      {/* Speech tail */}
      <Path d="M 7 20 L 1 29 L 15 20" stroke="#F6C90E" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      <Circle cx={8} cy={11.5} r={2.5} fill="#F6C90E" />
      <Circle cx={13} cy={11.5} r={2.5} fill="#F6C90E" />
      <Circle cx={18} cy={11.5} r={2.5} fill="#F6C90E" />
      {/* Broadcast node */}
      <Circle cx={23} cy={4} r={3} fill="#F6C90E" />
      {/* Inner arc */}
      <Path d="M 26 5 Q 32 11 32 16.5" stroke="#F6C90E" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      {/* Outer arc */}
      <Path d="M 29 2 Q 37 10 37 17" stroke="#F6C90E" strokeWidth={2} strokeLinecap="round" opacity={0.45} />
      {/* Blue accent dot */}
      <Circle cx={32} cy={16.5} r={2.5} fill="#4F6EF7" />
    </Svg>
  );
}

export function CircleIcon({ size = 28, active = false }: IconProps) {
  const green = active ? '#10B981' : MUTED;
  const gold = active ? '#F6C90E' : MUTED;
  const blue = active ? '#4F6EF7' : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={16} r={13} stroke={green} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
      <Path d="M 16 4 Q 27 10 26 22" stroke={green} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <Path d="M 26 22 Q 16 28 6 22" stroke={green} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <Path d="M 6 22 Q 5 10 16 4" stroke={green} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <Circle cx={16} cy={4} r={3.5} fill={gold} />
      <Circle cx={26} cy={22} r={3.5} fill={blue} />
      <Circle cx={6} cy={22} r={3.5} fill={green} />
      <Circle cx={16} cy={16} r={3} fill={green} />
    </Svg>
  );
}

export function PointsIcon({ size = 28, active = false }: IconProps) {
  const gold = active ? '#F6C90E' : MUTED;
  const blue = active ? '#4F6EF7' : MUTED;
  const violet = active ? '#7C3AED' : MUTED;
  const green = active ? '#10B981' : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke={gold} strokeWidth={2} />
      <Path d="M 9 22 Q 12 12 16 9 Q 20 12 23 22" stroke={gold} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={16} cy={9} r={3} fill={gold} />
      <Circle cx={9} cy={22} r={2.5} fill={gold} opacity={0.6} />
      <Circle cx={23} cy={22} r={2.5} fill={gold} opacity={0.6} />
      <Circle cx={16} cy={2} r={2} fill={blue} />
      <Circle cx={28} cy={9} r={2} fill={violet} />
      <Circle cx={28} cy={23} r={2} fill={green} />
    </Svg>
  );
}

export function ProfileIcon({ size = 28, active = false }: IconProps) {
  const violet = active ? '#7C3AED' : MUTED;
  const gold = active ? '#F6C90E' : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={12} r={7} stroke={violet} strokeWidth={2} />
      <Path d="M 3 30 Q 3 21 16 19 Q 29 21 29 30" stroke={violet} strokeWidth={2} strokeLinecap="round" />
      <Path d="M 6 12 Q 5 1 16 0 Q 27 1 26 12" stroke={gold} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={16} cy={0} r={3} fill={gold} />
      <Circle cx={6} cy={12} r={2.5} fill={violet} />
      <Circle cx={26} cy={12} r={2.5} fill={violet} />
    </Svg>
  );
}

export function ChatsIcon({ size = 28, active = false }: IconProps) {
  const blue = active ? '#4F6EF7' : MUTED;
  const gold = active ? '#F6C90E' : MUTED;
  const green = active ? '#10B981' : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Speech bubble outline */}
      <Path
        d="M 4 6 Q 4 2 8 2 L 24 2 Q 28 2 28 6 L 28 19 Q 28 23 24 23 L 12 23 L 5 30 L 7 23 L 8 23 Q 4 23 4 19 Z"
        stroke={blue}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Left node */}
      <Circle cx={10} cy={12} r={3} fill={gold} />
      {/* Right node */}
      <Circle cx={22} cy={12} r={3} fill={green} />
      {/* Arc bridge between nodes */}
      <Path
        d="M 13 12 Q 16 7 19 12"
        stroke={blue}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Arc Bridge accent dot */}
      <Circle cx={16} cy={8.5} r={2} fill={blue} />
    </Svg>
  );
}

type TabName = 'home' | 'shout' | 'circle' | 'chats' | 'points' | 'profile';

interface TabIconProps {
  tab: TabName;
  size?: number;
  active?: boolean;
}

const ICON_MAP: Record<TabName, React.ComponentType<IconProps>> = {
  home: HomeIcon,
  shout: ShoutIcon,
  circle: CircleIcon,
  chats: ChatsIcon,
  points: PointsIcon,
  profile: ProfileIcon,
};

export function TabIcon({ tab, size = 28, active = false }: TabIconProps) {
  const Icon = ICON_MAP[tab];
  return <Icon size={size} active={active} />;
}
