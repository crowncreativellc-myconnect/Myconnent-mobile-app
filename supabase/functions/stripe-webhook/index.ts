// supabase/functions/stripe-webhook/index.ts
// Receives Stripe webhook events. Verifies the signature and updates the
// database accordingly. ALWAYS returns 200 to Stripe — errors are logged.
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt
// Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//                   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
};

function ok(): Response {
  // Always 200 so Stripe stops retrying — internal failures are logged.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('[stripe-webhook] missing required env');
    return ok();
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let event: Stripe.Event;
  try {
    const signature = req.headers.get('stripe-signature') ?? '';
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'signature verification failed';
    console.error('[stripe-webhook] verify failed:', message);
    return ok();
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const proposalId = intent.metadata?.proposal_id;
        if (!proposalId) {
          console.error('[stripe-webhook] succeeded without proposal_id');
          break;
        }

        // Idempotency: skip if already processed (points already awarded).
        const { data: existing } = await admin
          .from('payment_proposals')
          .select('id, status, points_awarded')
          .eq('id', proposalId)
          .maybeSingle();

        if (!existing) {
          console.error(`[stripe-webhook] proposal ${proposalId} not found`);
          break;
        }
        if (existing.points_awarded || existing.status === 'paid') {
          console.log(`[stripe-webhook] proposal ${proposalId} already finalised`);
          break;
        }

        const charge = await stripe.charges.list({
          payment_intent: intent.id,
          limit: 1,
        });
        const transfer =
          charge.data[0]?.transfer && typeof charge.data[0].transfer === 'string'
            ? charge.data[0].transfer
            : null;

        const { error: updErr } = await admin
          .from('payment_proposals')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_transfer_id: transfer,
          })
          .eq('id', proposalId);

        if (updErr) console.error('[stripe-webhook] proposal paid update failed:', updErr.message);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const proposalId = intent.metadata?.proposal_id;
        if (!proposalId) break;

        const { data: proposal } = await admin
          .from('payment_proposals')
          .select('id, chat_id')
          .eq('id', proposalId)
          .maybeSingle();
        if (!proposal) break;

        await admin
          .from('payment_proposals')
          .update({ status: 'failed' })
          .eq('id', proposalId);

        await admin.from('chat_messages').insert({
          chat_id: proposal.chat_id,
          sender_id: null,
          body:
            '⚠️ Payment failed. Please review your payment method and tap the payment request to try again.',
          is_system_message: true,
          message_type: 'system',
          payment_proposal_id: proposalId,
        });
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboardingComplete =
          Boolean(account.details_submitted) &&
          Boolean(account.charges_enabled) &&
          Boolean(account.payouts_enabled);

        const { error: updErr } = await admin
          .from('stripe_connect_accounts')
          .update({
            charges_enabled: Boolean(account.charges_enabled),
            payouts_enabled: Boolean(account.payouts_enabled),
            onboarding_complete: onboardingComplete,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id);

        if (updErr) console.error('[stripe-webhook] account update failed:', updErr.message);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId =
          typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : dispute.payment_intent?.id;
        if (!paymentIntentId) break;

        const { data: proposal } = await admin
          .from('payment_proposals')
          .select('id, chat_id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle();
        if (!proposal) break;

        await admin
          .from('payment_proposals')
          .update({ status: 'disputed' })
          .eq('id', proposal.id);

        await admin
          .from('chats')
          .update({
            is_locked: true,
            locked_reason:
              'Payment dispute in progress. Contact support@mykonnect.app',
            payment_status: 'disputed',
          })
          .eq('id', proposal.chat_id);

        await admin.from('chat_messages').insert({
          chat_id: proposal.chat_id,
          sender_id: null,
          body:
            '🔒 A payment dispute has been opened. This chat is locked while MyKonnect support reviews the case. Email support@mykonnect.app for help.',
          is_system_message: true,
          message_type: 'system',
          payment_proposal_id: proposal.id,
        });
        break;
      }

      default:
        // Ignore everything else.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripe-webhook] handler error for ${event.type}:`, message);
  }

  return ok();
});
