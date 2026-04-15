// supabase/functions/parse-shout/index.ts
// Deploy with: supabase functions deploy parse-shout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface ParseRequest {
  raw_text: string;
}

interface ParseResponse {
  skill_tags: string[];
  urgency: 'routine' | 'urgent' | 'asap';
  complexity: 'simple_task' | 'project' | 'ongoing';
  format: 'in_person' | 'remote' | 'async';
  draft_text: string;
  confidence: number;
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
    const { raw_text } = (await req.json()) as ParseRequest;

    if (!raw_text || raw_text.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required and must be at least 5 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const systemPrompt = `You are the AI parser for MyConnect, a professional trust network.
Your job is to extract structured information from a user's professional service request.

ALWAYS respond with ONLY valid JSON matching this exact schema:
{
  "skill_tags": string[],       // 2-5 snake_case skill/domain tags (e.g. "contract_law", "react_native")
  "urgency": "routine" | "urgent" | "asap",
  "complexity": "simple_task" | "project" | "ongoing",
  "format": "in_person" | "remote" | "async",
  "draft_text": string,         // Clean, professional 1-2 sentence shout-out ready to send
  "confidence": number          // 0.0–1.0 how confident you are in the parse
}

Guidelines:
- skill_tags should be specific and searchable (prefer "contract_law" over "law")
- urgency: asap = hours, urgent = 1-3 days, routine = flexible
- complexity: simple_task = one-off, project = defined scope, ongoing = recurring
- draft_text should be professional, concise, and start with "Need" or "Looking for"
- Do NOT include markdown, explanation, or any text outside the JSON object.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: raw_text },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed: ParseResponse = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
