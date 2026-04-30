import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { PaymentProposal } from '../types';

interface PaymentProposalCardProps {
  proposal: PaymentProposal;
  currentUserId: string;
  providerOnboardingComplete: boolean;
  onPay: (proposalId: string) => void;
  onProviderOnboard: () => void;
}

const GOLD = '#F6C90E';
const ACCENT_GREEN = '#10B981';
const DANGER_RED = '#EF4444';
const AMBER = '#F59E0B';

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PaymentProposalCard({
  proposal,
  currentUserId,
  providerOnboardingComplete,
  onPay,
  onProviderOnboard,
}: PaymentProposalCardProps) {
  const { colors } = useTheme();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const isClient = proposal.client_id === currentUserId;
  const isProvider = proposal.proposed_by_id === currentUserId;

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginVertical: 8,
        backgroundColor: colors.bgElevated,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: GOLD,
        borderWidth: 1,
        borderColor: colors.borderGlass,
        padding: 16,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 18, marginRight: 6 }}>💳</Text>
        <Text
          style={{
            color: GOLD,
            fontFamily: 'Inter-Bold',
            fontSize: 13,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Payment Request
        </Text>
      </View>

      {/* Description */}
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          lineHeight: 20,
          marginBottom: 12,
        }}
      >
        {proposal.description}
      </Text>

      {/* Amount */}
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: 'Inter-Bold',
          fontSize: 32,
          marginBottom: 4,
        }}
      >
        {dollars(proposal.amount_cents)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
        {proposal.currency.toUpperCase()}
      </Text>

      {/* Breakdown toggle */}
      <TouchableOpacity
        onPress={() => setShowBreakdown((v) => !v)}
        style={{ marginBottom: showBreakdown ? 8 : 12 }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>
          {showBreakdown ? 'Hide breakdown' : 'See breakdown'}
        </Text>
      </TouchableOpacity>

      {showBreakdown && (
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Row label="Service total" value={dollars(proposal.amount_cents)} colors={colors} />
          <Row
            label="MyKonnect fee (8%)"
            value={`− ${dollars(proposal.service_fee_cents)}`}
            colors={colors}
            muted
          />
          <Row
            label="Provider receives"
            value={dollars(proposal.provider_receives_cents)}
            colors={colors}
            highlightColor={ACCENT_GREEN}
            bold
          />
        </View>
      )}

      {/* Status row */}
      <StatusBadge proposal={proposal} isClient={isClient} isProvider={isProvider} />

      {/* Actions */}
      {isClient && proposal.status === 'pending' && (
        <TouchableOpacity
          onPress={() => onPay(proposal.id)}
          style={{
            marginTop: 12,
            backgroundColor: GOLD,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#0A0E27', fontFamily: 'Inter-Bold', fontSize: 16 }}>
            Pay {dollars(proposal.amount_cents)}
          </Text>
        </TouchableOpacity>
      )}

      {isClient && proposal.status === 'failed' && (
        <TouchableOpacity
          onPress={() => onPay(proposal.id)}
          style={{
            marginTop: 12,
            backgroundColor: GOLD,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#0A0E27', fontFamily: 'Inter-Bold', fontSize: 16 }}>
            Retry payment
          </Text>
        </TouchableOpacity>
      )}

      {isProvider && !providerOnboardingComplete && proposal.status === 'pending' && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: 'rgba(245,158,11,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(245,158,11,0.35)',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: AMBER, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
            ⚠️ You need to set up your payment account to receive funds.
          </Text>
          <TouchableOpacity
            onPress={onProviderOnboard}
            style={{
              backgroundColor: AMBER,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#0A0E27', fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
              Set up payments
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  muted?: boolean;
  bold?: boolean;
  highlightColor?: string;
}

function Row({ label, value, colors, muted, bold, highlightColor }: RowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: muted ? colors.textMuted : colors.textSecondary,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: highlightColor ?? (muted ? colors.textMuted : colors.textPrimary),
          fontSize: 13,
          fontFamily: bold ? 'Inter-Bold' : 'Inter-SemiBold',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  proposal: PaymentProposal;
  isClient: boolean;
  isProvider: boolean;
}

function StatusBadge({ proposal, isClient, isProvider }: StatusBadgeProps) {
  const { colors } = useTheme();

  const Pill = ({
    bg,
    fg,
    border,
    children,
  }: {
    bg: string;
    fg: string;
    border?: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bg,
        borderRadius: 999,
        borderWidth: border ? 1 : 0,
        borderColor: border,
        paddingHorizontal: 12,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontFamily: 'Inter-SemiBold' }}>{children}</Text>
    </View>
  );

  switch (proposal.status) {
    case 'pending':
      return (
        <Pill bg="rgba(246,201,14,0.12)" fg={GOLD} border="rgba(246,201,14,0.35)">
          {isClient ? 'Awaiting your payment' : isProvider ? 'Payment requested' : 'Pending'}
        </Pill>
      );
    case 'awaiting_payment':
    case 'processing':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color={colors.textMuted} size="small" />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 8 }}>
            Processing…
          </Text>
        </View>
      );
    case 'paid':
      return (
        <Pill bg="rgba(16,185,129,0.12)" fg={ACCENT_GREEN} border="rgba(16,185,129,0.35)">
          ✓ Paid {proposal.paid_at ? `· ${formatDate(proposal.paid_at)}` : ''}
        </Pill>
      );
    case 'failed':
      return (
        <Pill bg="rgba(239,68,68,0.12)" fg={DANGER_RED} border="rgba(239,68,68,0.35)">
          Payment failed — tap to retry
        </Pill>
      );
    case 'disputed':
      return (
        <Pill bg="rgba(239,68,68,0.12)" fg={DANGER_RED} border="rgba(239,68,68,0.35)">
          Under dispute
        </Pill>
      );
    case 'refunded':
      return (
        <Pill bg="rgba(74,85,120,0.18)" fg={colors.textMuted}>
          Refunded
        </Pill>
      );
    case 'cancelled':
      return (
        <Pill bg="rgba(74,85,120,0.18)" fg={colors.textMuted}>
          Cancelled
        </Pill>
      );
    default:
      return null;
  }
}
