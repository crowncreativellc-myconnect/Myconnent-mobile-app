import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, invokeEdgeFunction } from '../lib/supabase';
import { useSession } from './useSession';
import type { ApiResult, PaymentProposal, StripeConnectAccount } from '../types';

const MIN_AMOUNT_DOLLARS = 1;
const MAX_AMOUNT_DOLLARS = 10_000;
const SERVICE_FEE_PERCENT = 0.08;

interface FeeBreakdown {
  grossAmount: string;
  serviceFee: string;
  providerReceives: string;
  serviceFeePercent: string;
}

interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

interface ConnectOnboardResponse {
  stripe_account_id: string;
  account_link_url: string;
  onboarding_complete: boolean;
}

interface FeeRow {
  service_fee_cents: number;
  provider_receives_cents: number;
}

interface ProviderOnboardingState {
  hasAccount: boolean;
  onboardingComplete: boolean;
  account: StripeConnectAccount | null;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function dollarsToCents(amountDollars: number): number {
  return Math.round(amountDollars * 100);
}

export function usePayments() {
  const { profile } = useSession();

  // ─── proposePayment ───────────────────────────────────────────────────────
  const proposePayment = useCallback(
    async (
      chatId: string,
      shoutId: string,
      amountDollars: number,
      description: string,
    ): Promise<ApiResult<PaymentProposal>> => {
      if (!profile) return { data: null, error: { message: 'Not authenticated' } };

      if (
        !Number.isFinite(amountDollars) ||
        amountDollars < MIN_AMOUNT_DOLLARS ||
        amountDollars > MAX_AMOUNT_DOLLARS
      ) {
        return {
          data: null,
          error: {
            message: `Amount must be between $${MIN_AMOUNT_DOLLARS} and $${MAX_AMOUNT_DOLLARS}.`,
          },
        };
      }
      if (!description.trim()) {
        return { data: null, error: { message: 'Description is required.' } };
      }

      const amountCents = dollarsToCents(amountDollars);

      try {
        // Source of truth: Postgres calculates the fee.
        const { data: feeRow, error: feeErr } = await supabase
          .rpc('calculate_mykonnect_fee', { p_amount_cents: amountCents })
          .single<FeeRow>();

        if (feeErr || !feeRow) {
          return {
            data: null,
            error: { message: feeErr?.message ?? 'Failed to calculate fee' },
          };
        }

        // Look up the chat to identify the client (the other participant).
        const { data: chat, error: chatErr } = await supabase
          .from('chats')
          .select('id, participant_ids')
          .eq('id', chatId)
          .single();

        if (chatErr || !chat) {
          return {
            data: null,
            error: { message: chatErr?.message ?? 'Chat not found' },
          };
        }

        const clientId = (chat.participant_ids as string[]).find((p) => p !== profile.id);
        if (!clientId) {
          return { data: null, error: { message: 'Could not identify client in chat' } };
        }

        const { data: proposal, error: insertErr } = await supabase
          .from('payment_proposals')
          .insert({
            chat_id: chatId,
            shout_id: shoutId,
            proposed_by_id: profile.id,
            client_id: clientId,
            amount_cents: amountCents,
            currency: 'usd',
            description: description.trim(),
            service_fee_cents: feeRow.service_fee_cents,
            platform_fee_cents: feeRow.service_fee_cents,
            provider_receives_cents: feeRow.provider_receives_cents,
            status: 'pending',
          })
          .select('*')
          .single<PaymentProposal>();

        if (insertErr || !proposal) {
          return {
            data: null,
            error: { message: insertErr?.message ?? 'Failed to create proposal' },
          };
        }

        // Drop a special chat message linking back to the proposal.
        const { error: msgErr } = await supabase.from('chat_messages').insert({
          chat_id: chatId,
          sender_id: profile.id,
          body: `Payment request: ${dollars(amountCents)} — ${description.trim()}`,
          message_type: 'payment_proposal',
          payment_proposal_id: proposal.id,
        });

        if (msgErr) {
          return { data: null, error: { message: msgErr.message } };
        }

        await supabase
          .from('chats')
          .update({
            payment_proposal_id: proposal.id,
            payment_status: 'pending',
            last_message_at: new Date().toISOString(),
          })
          .eq('id', chatId);

        return { data: proposal, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send payment request';
        return { data: null, error: { message } };
      }
    },
    [profile],
  );

  // ─── calculateFeeBreakdown (display-only) ────────────────────────────────
  const calculateFeeBreakdown = useCallback((amountDollars: number): FeeBreakdown => {
    const safe = Number.isFinite(amountDollars) && amountDollars > 0 ? amountDollars : 0;
    const grossCents = dollarsToCents(safe);
    const feeCents = Math.floor(grossCents * SERVICE_FEE_PERCENT);
    const netCents = grossCents - feeCents;
    return {
      grossAmount: dollars(grossCents),
      serviceFee: dollars(feeCents),
      providerReceives: dollars(netCents),
      serviceFeePercent: '8%',
    };
  }, []);

  // ─── initiatePayment ──────────────────────────────────────────────────────
  const initiatePayment = useCallback(
    async (proposalId: string): Promise<ApiResult<null>> => {
      try {
        const { data: proposal, error: propErr } = await supabase
          .from('payment_proposals')
          .select('*, provider:profiles!payment_proposals_proposed_by_id_fkey(id, full_name)')
          .eq('id', proposalId)
          .single();

        if (propErr || !proposal) {
          return { data: null, error: { message: propErr?.message ?? 'Proposal not found' } };
        }

        const { data: connect, error: connectErr } = await supabase
          .from('stripe_connect_accounts')
          .select('*')
          .eq('user_id', proposal.proposed_by_id)
          .maybeSingle();

        if (connectErr) return { data: null, error: { message: connectErr.message } };
        if (!connect || !connect.charges_enabled) {
          return {
            data: null,
            error: {
              message:
                'The provider has not finished setting up their payment account. Ask them to complete Stripe onboarding.',
            },
          };
        }

        const { data, error } = await invokeEdgeFunction<
          { proposal_id: string; chat_id: string; provider_stripe_account_id: string },
          CreatePaymentIntentResponse
        >('create-payment-intent', {
          proposal_id: proposal.id,
          chat_id: proposal.chat_id,
          provider_stripe_account_id: connect.stripe_account_id,
        });

        if (error || !data?.client_secret) {
          return {
            data: null,
            error: { message: error?.message ?? 'Failed to create payment intent' },
          };
        }

        const { error: initErr } = await initPaymentSheet({
          merchantDisplayName: 'MyKonnect',
          paymentIntentClientSecret: data.client_secret,
          allowsDelayedPaymentMethods: false,
          returnURL: 'myconnect://stripe-redirect',
        });

        if (initErr) {
          Alert.alert('Payment error', initErr.message);
          return { data: null, error: { message: initErr.message } };
        }

        const { error: presentErr } = await presentPaymentSheet();

        if (presentErr) {
          if (presentErr.code === 'Canceled') {
            return { data: null, error: null };
          }
          Alert.alert('Payment error', presentErr.message);
          return { data: null, error: { message: presentErr.message } };
        }

        // Sheet completed successfully. The webhook will flip status to 'paid'.
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  // ─── checkProviderOnboarding ─────────────────────────────────────────────
  const checkProviderOnboarding = useCallback(
    async (userId: string): Promise<ApiResult<ProviderOnboardingState>> => {
      try {
        const { data, error } = await supabase
          .from('stripe_connect_accounts')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) return { data: null, error: { message: error.message } };

        const account = (data ?? null) as StripeConnectAccount | null;
        return {
          data: {
            hasAccount: account !== null,
            onboardingComplete: account?.onboarding_complete === true,
            account,
          },
          error: null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check onboarding';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  // ─── startProviderOnboarding ─────────────────────────────────────────────
  const startProviderOnboarding = useCallback(async (): Promise<ApiResult<null>> => {
    if (!profile) return { data: null, error: { message: 'Not authenticated' } };
    try {
      const { data, error } = await invokeEdgeFunction<
        { user_id: string; email: string; country: string },
        ConnectOnboardResponse
      >('stripe-connect-onboard', {
        user_id: profile.id,
        email: profile.email,
        country: 'US',
      });

      if (error || !data?.account_link_url) {
        return {
          data: null,
          error: { message: error?.message ?? 'Failed to start onboarding' },
        };
      }

      await Linking.openURL(data.account_link_url);
      return { data: null, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start onboarding';
      return { data: null, error: { message } };
    }
  }, [profile]);

  // ─── fetchProposalForChat ────────────────────────────────────────────────
  const fetchProposalForChat = useCallback(
    async (chatId: string): Promise<ApiResult<PaymentProposal | null>> => {
      try {
        const { data, error } = await supabase
          .from('payment_proposals')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<PaymentProposal>();

        if (error) return { data: null, error: { message: error.message } };
        return { data: data ?? null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch proposal';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  // ─── subscribeToPaymentStatus ────────────────────────────────────────────
  const subscribeToPaymentStatus = useCallback(
    (
      proposalId: string,
      onUpdate: (proposal: PaymentProposal) => void,
    ): RealtimeChannel => {
      return supabase
        .channel(`payment-proposal-${proposalId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_proposals',
            filter: `id=eq.${proposalId}`,
          },
          (payload) => {
            onUpdate(payload.new as PaymentProposal);
          },
        )
        .subscribe();
    },
    [],
  );

  // ─── cancelProposal ──────────────────────────────────────────────────────
  // Provider-only: marks a pending proposal cancelled. RLS denies UPDATE so
  // this routes through an Edge Function in production; for the MVP we use a
  // plain update guarded by status='pending' AND proposed_by_id = auth.uid()
  // once an updateable RLS policy is added. Today this is a no-op stub that
  // returns an explanatory error so the UI can surface the limitation.
  const cancelProposal = useCallback(
    async (proposalId: string): Promise<ApiResult<null>> => {
      try {
        const { error } = await supabase
          .from('payment_proposals')
          .update({ status: 'cancelled' })
          .eq('id', proposalId)
          .eq('status', 'pending');

        if (error) return { data: null, error: { message: error.message } };
        return { data: null, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel proposal';
        return { data: null, error: { message } };
      }
    },
    [],
  );

  return {
    proposePayment,
    calculateFeeBreakdown,
    initiatePayment,
    checkProviderOnboarding,
    startProviderOnboarding,
    fetchProposalForChat,
    subscribeToPaymentStatus,
    cancelProposal,
  };
}
