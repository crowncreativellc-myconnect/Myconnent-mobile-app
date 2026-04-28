// supabase/functions/flag-review/index.ts
// Deploy with: supabase functions deploy flag-review
//
// Queues borderline content (risk 0.55–0.80) for human review.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FlagReviewRequest {
  user_id: string;
  raw_text: string;
  risk_score: number;
  category: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as FlagReviewRequest;
    const { user_id, raw_text, risk_score, category } = body;

    if (!user_id || !raw_text || risk_score == null) {
      return new Response(
        JSON.stringify({ error: 'user_id, raw_text, and risk_score are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[flag-review] Missing Supabase env vars');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const client = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await client
      .from('moderation_queue')
      .insert({
        user_id,
        raw_text,
        risk_score,
        category: category ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[flag-review] insert error:', error.message);
      return new Response(
        JSON.stringify({ error: 'Failed to queue for review' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ queued: true, queue_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[flag-review] error:', err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
