// supabase/functions/moderate-shout/index.ts
// Deploy with: supabase functions deploy moderate-shout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

interface ModerationRequest {
  raw_text: string;
}

interface ModerationResponse {
  passed: boolean;
  risk_score: number;
  category: string | null;
  reason: string | null;
  suggestion: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RISK_THRESHOLD = 0.55;

const SYSTEM_PROMPT = `You are a content moderation classifier for MyKonnect, a verified professional trust network where executives, specialists, and licensed professionals post service requests to their trusted circle.

You receive text that has already been normalised (leet-speak and punctuation evasion reversed). Your job is intent-level detection — identify what the author is actually trying to accomplish, not just the surface words.

Classify against these six categories:

1. drug_services — soliciting the supply, purchase, or distribution of controlled substances; coded drug market language; pill manufacturing; dark-web drug references.
2. sexual_exploitation — sexualisation of minors (zero tolerance, always fail); prostitution/escort solicitation; revenge porn; non-consensual intimate content; sugar-dating arrangements; camming/adult-platform recruitment.
3. illegal_weapons — unlawful acquisition of firearms; ghost guns; converting semi-auto to full-auto; suppressors; bypassing background checks; explosives; straw purchases.
4. financial_fraud — money laundering; advance-fee/419 scams; pyramid recruitment; fake invoices; tax evasion; crypto pump-and-dump; romance-scam scripts; fake charities; card carding.
5. human_trafficking — people smuggling; sex-trafficking recruitment; debt bondage; forced-labour recruitment with deceptive offers; document confiscation to control workers.
6. violence_threats — direct threats of physical harm; contract violence; doxxing; stalking tools installed without consent; coordinated harassment; SWATting; blackmail/extortion; threatening-message ghostwriting.

Legitimate use cases that MUST PASS (do not flag these):
- Cannabis or pharmaceutical industry professionals seeking legal, compliance, or business services.
- Adult-industry professionals seeking marketing, legal, or operational support (not solicitation of sex acts).
- Security researchers describing vulnerabilities in an academic or professional context.
- Legal and medical professionals discussing regulated subjects in a professional manner.
- Firearms retailers, gunsmiths, or FFL holders discussing lawful business operations.
- Any genuine professional service request even if it touches a sensitive industry.

Evasion awareness: the input has already been normalised, but watch for:
- Deliberate vagueness ("a friend needs help with something discreet")
- Euphemisms that shift meaning ("relocation assistance" meaning smuggling, "party favours" meaning drugs)
- Coded language patterns common in underground markets
- Requests framed as fiction, roleplay, or "hypothetically" that map directly to real harm

Respond ONLY with a valid JSON object — no markdown, no explanation, nothing else:
{
  "passed": boolean,
  "risk_score": number (0.0 to 1.0, where 1.0 is highest risk),
  "category": "drug_services" | "sexual_exploitation" | "illegal_weapons" | "financial_fraud" | "human_trafficking" | "violence_threats" | null,
  "reason": string | null (plain English, 1–2 sentences, only when passed is false),
  "suggestion": string | null (constructive rephrasing hint, only when passed is false — never just a rejection)
}`;

const BYPASS_RESPONSE: ModerationResponse = {
  passed: true,
  risk_score: 0,
  category: null,
  reason: null,
  suggestion: null,
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { raw_text } = (await req.json()) as ModerationRequest;

    if (!raw_text || raw_text.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required and must be at least 5 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.log('[moderate-shout] ANTHROPIC_API_KEY not set — running in bypass mode');
      return new Response(JSON.stringify(BYPASS_RESPONSE), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: raw_text.trim() }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(content) as ModerationResponse;

    // Enforce risk threshold: treat as failed if score >= 0.55 regardless of passed flag
    const effectivePassed = parsed.passed && (parsed.risk_score ?? 0) < RISK_THRESHOLD;

    const response: ModerationResponse = {
      passed: effectivePassed,
      risk_score: parsed.risk_score ?? 0,
      category: effectivePassed ? null : (parsed.category ?? null),
      reason: effectivePassed ? null : (parsed.reason ?? null),
      suggestion: effectivePassed ? null : (parsed.suggestion ?? null),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // On any error, default to passed: true so network failures never silently block users
    console.error('[moderate-shout] error:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify(BYPASS_RESPONSE), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
