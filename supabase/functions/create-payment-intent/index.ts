// supabase/functions/create-payment-intent/index.ts
// Creates a Stripe PaymentIntent for an existing payment proposal.
// Deploy with: supabase functions deploy create-payment-intent
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

interface CreatePaymentIntentRequest {
  proposal_id: string;
  chat_id: string;
  provider_stripe_account_id: string;
}

interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      console.error('[create-payment-intent] missing required env');
      return jsonError('Server misconfigured', 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify the calling user via the JWT in the Authorization header.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonError('Not authenticated', 401);
    }
    const callerId = userData.user.id;

    // Service-role client for trusted reads + writes.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as Partial<CreatePaymentIntentRequest>;
    const { proposal_id, chat_id, provider_stripe_account_id } = body;
    if (!proposal_id || !chat_id || !provider_stripe_account_id) {
      return jsonError('proposal_id, chat_id, and provider_stripe_account_id are required', 400);
    }

    const { data: proposal, error: propErr } = await admin
      .from('payment_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (propErr || !proposal) {
      return jsonError('Proposal not found', 404);
    }

    if (proposal.client_id !== callerId) {
      return jsonError('Only the client on this proposal can pay it', 403);
    }
    if (proposal.chat_id !== chat_id) {
      return jsonError('chat_id does not match proposal', 400);
    }
    if (proposal.status !== 'pending') {
      return jsonError(`Proposal is not payable (status=${proposal.status})`, 409);
    }

    const intent = await stripe.paymentIntents.create({
      amount: proposal.amount_cents,
      currency: proposal.currency ?? 'usd',
      application_fee_amount: proposal.service_fee_cents,
      transfer_data: { destination: provider_stripe_account_id },
      automatic_payment_methods: { enabled: true },
      metadata: {
        proposal_id: proposal.id,
        chat_id: proposal.chat_id,
        shout_id: proposal.shout_id,
        mykonnect_service_fee_cents: String(proposal.service_fee_cents),
      },
    });

    const { error: updateErr } = await admin
      .from('payment_proposals')
      .update({
        status: 'awaiting_payment',
        stripe_payment_intent_id: intent.id,
        client_secret: intent.client_secret,
      })
      .eq('id', proposal.id);

    if (updateErr) {
      console.error('[create-payment-intent] failed to persist intent:', updateErr.message);
      return jsonError('Failed to persist payment intent', 500);
    }

    const response: CreatePaymentIntentResponse = {
      client_secret: intent.client_secret ?? '',
      payment_intent_id: intent.id,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[create-payment-intent] error:', message);
    return jsonError(message, 500);
  }
});
