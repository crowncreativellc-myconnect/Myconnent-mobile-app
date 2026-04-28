import React from 'react';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const GOLD   = '#F6C90E';
const BLUE   = '#4F6EF7';
const GREEN  = '#10B981';
const GREY   = '#4A5578';

// ─── Active fill tints ────────────────────────────────────────────────────────
const GOLD_10  = 'rgba(246,201,14,0.10)';
const GOLD_06  = 'rgba(246,201,14,0.06)';
const GOLD_04  = 'rgba(246,201,14,0.04)';
const GOLD_20  = 'rgba(246,201,14,0.20)';
const GOLD_40  = 'rgba(246,201,14,0.40)';
const GOLD_20s = 'rgba(246,201,14,0.20)';

interface ShoutIconProps {
  size?: number;
  active?: boolean;
}

/**
 * V5 Broadcast Bullhorn — drop-in replacement for the Shout Out tab icon.
 *
 * Anatomy:
 *   - Trigger grip + finger guard  (bottom-left)
 *   - Rectangular body with speaker grille lines
 *   - Exponential horn flare
 *   - Elliptical bell rim + inner depth ring
 *   - Three signal arcs (strong / medium / faint)
 *   - Gold node at bell tip  → AI matching engine
 *   - Blue node at horn root → AI parse point
 *   - Green node at grip     → connection made
 *
 * Usage:
 *   import { ShoutIcon } from '../../src/components/ShoutIcon';
 *   tabBarIcon: ({ focused }) => <ShoutIcon size={26} active={focused} />
 */
export function ShoutIcon({ size = 28, active = false }: ShoutIconProps) {
  const stroke    = active ? GOLD  : GREY;
  const goldFill  = active ? GOLD  : GREY;
  const blueFill  = active ? BLUE  : GREY;
  const greenFill = active ? GREEN : GREY;
  const opacity   = active ? 1     : 0.38;

  // Tinted fills — only visible when active
  const bodyFill   = active ? GOLD_10 : 'transparent';
  const grilleFill = active ? GOLD_20 : 'transparent';
  const hornFill   = active ? GOLD_06 : 'transparent';
  const rimFill    = active ? GOLD_04 : 'transparent';
  const gripFill   = active ? GOLD_20 : 'transparent';

  return (
    <Svg width={size} height={size} viewBox="0 0 44 32" fill="none">

      {/* ── Trigger grip ───────────────────────────────────── */}
      <Path
        d="M 3,13 Q 3,18 6,19 L 6,14 Q 5,12 3,13 Z"
        fill={gripFill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        opacity={opacity}
      />
      {/* Finger guard */}
      <Path
        d="M 6,19 Q 8,21 8,18"
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={opacity}
      />

      {/* ── Body ───────────────────────────────────────────── */}
      <Path
        d="M 6,10 L 6,18 L 13,22 L 13,8 Z"
        fill={bodyFill}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        opacity={opacity}
      />

      {/* Speaker grille lines */}
      <Line
        x1="7.5" y1="11" x2="12" y2="9.5"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={active ? 0.45 : 0.2}
      />
      <Line
        x1="7.5" y1="13.5" x2="12" y2="12"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={active ? 0.45 : 0.2}
      />
      <Line
        x1="7.5" y1="16" x2="12" y2="14.5"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={active ? 0.45 : 0.2}
      />

      {/* ── Exponential horn flare ─────────────────────────── */}
      <Path
        d="M 13,8 Q 19,6 24,2 Q 29,8 30,15 Q 29,22 24,28 Q 19,26 13,22"
        fill={hornFill}
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinejoin="round"
        opacity={opacity}
      />

      {/* ── Bell rim — outer ellipse ───────────────────────── */}
      <Ellipse
        cx="27" cy="15" rx="4.5" ry="13"
        fill={rimFill}
        stroke={stroke}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Inner depth ring */}
      <Ellipse
        cx="25" cy="15" rx="2.8" ry="9.5"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity={active ? 0.22 : 0.1}
      />

      {/* ── Signal arcs ────────────────────────────────────── */}
      {/* Arc 1 — strong */}
      <Path
        d="M 32,5 Q 36,10 36,15 Q 36,20 32,25"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={active ? 0.8 : 0.28}
      />
      {/* Arc 2 — medium */}
      <Path
        d="M 35,1 Q 40,8 40,15 Q 40,22 35,29"
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={active ? 0.45 : 0.16}
      />
      {/* Arc 3 — faint */}
      <Path
        d="M 38,-2 Q 44,6 44,15 Q 44,24 38,32"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={active ? 0.2 : 0.08}
      />

      {/* ── Brand nodes ────────────────────────────────────── */}
      {/* Gold — bell tip, AI engine */}
      <Circle cx="27" cy="15" r="3" fill={goldFill} opacity={opacity} />
      {/* Blue — horn root, AI parse */}
      <Circle cx="13" cy="8" r="2.5" fill={blueFill} opacity={opacity} />
      {/* Green — grip base, connection made */}
      <Circle cx="6" cy="16" r="2.5" fill={greenFill} opacity={opacity} />

    </Svg>
  );
}
