import type { TrustTier } from '../types';

// ─── cn() — class name helper (NativeWind compatible) ────────────────────────

type ClassValue = string | boolean | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Date & Time Formatters ───────────────────────────────────────────────────

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Number Formatters ────────────────────────────────────────────────────────

export function formatPoints(points: number): string {
  if (points >= 1_000) {
    return `${(points / 1_000).toFixed(1)}K`;
  }
  return points.toString();
}

export function formatTrustScore(score: number): string {
  return score.toFixed(0);
}

export function formatCompletionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// ─── Trust Tier Helpers ───────────────────────────────────────────────────────

export const TRUST_TIER_COLORS: Record<TrustTier, string> = {
  Member: '#94A3B8',      // silver
  Connector: '#4F6EF7',   // blue
  Trusted: '#7C3AED',     // violet
  Founding: '#F6C90E',    // gold
};

export const TRUST_TIER_ORDER: Record<TrustTier, number> = {
  Member: 0,
  Connector: 1,
  Trusted: 2,
  Founding: 3,
};

export function getTierColor(tier: TrustTier): string {
  return TRUST_TIER_COLORS[tier];
}

// ─── Skill Tag Helpers ────────────────────────────────────────────────────────

export function formatSkillTag(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Urgency Labels ───────────────────────────────────────────────────────────

export const URGENCY_LABELS = {
  routine: 'Routine',
  urgent: 'Urgent',
  asap: 'ASAP',
} as const;

export const URGENCY_COLORS = {
  routine: '#10B981',
  urgent: '#F59E0B',
  asap: '#EF4444',
} as const;

// ─── Avatar Initials ──────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return `${parts[0]?.charAt(0)}${parts[parts.length - 1]?.charAt(0)}`.toUpperCase();
}
