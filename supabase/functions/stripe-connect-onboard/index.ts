// supabase/functions/stripe-connect-onboard/index.ts
// Creates a Stripe Connect Express account for a provider and returns an
// onboarding link the app can open in a browser.
// Deploy with: supabase functions deploy stripe-connect-onboard
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

interface OnboardRequest {
  user_id: string;
  email: string;
  country?: string;
}

interface OnboardResponse {
  stripe_account_id: string;
  account_link_url: string;
  onboarding_complete: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETURN_URL = 'mykonnect://stripe-onboard/return';
const REFRESH_URL = 'mykonnect://stripe-onboard/refresh';

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
      console.error('[stripe-connect-onboard] missing required env');
      return jsonError('Server misconfigured', 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Authenticate the caller and ensure they're acting on their own account.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonError('Not authenticated', 401);
    }
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json()) as Partial<OnboardRequest>;
    const { user_id, email } = body;
    const country = body.country ?? 'US';

    if (!user_id || !email) {
      return jsonError('user_id and email are required', 400);
    }
    if (user_id !== callerId) {
      return jsonError('Cannot onboard another user', 403);
    }

    // Reuse an existing Connect account if we already have one for this user.
    const { data: existing } = await admin
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    let stripeAccountId = existing?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        country,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      const { error: insertErr } = await admin
        .from('stripe_connect_accounts')
        .insert({
          user_id,
          stripe_account_id: stripeAccountId,
          charges_enabled: false,
          payouts_enabled: false,
          onboarding_complete: false,
        });

      if (insertErr) {
        console.error('[stripe-connect-onboard] insert failed:', insertErr.message);
        return jsonError('Failed to persist Connect account', 500);
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: 'account_onboarding',
    });

    const response: OnboardResponse = {
      stripe_account_id: stripeAccountId,
      account_link_url: accountLink.url,
      onboarding_complete: existing?.onboarding_complete ?? false,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe-connect-onboard] error:', message);
    return jsonError(message, 500);
  }
});
