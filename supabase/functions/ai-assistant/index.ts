// =============================================================================
// FleetOps · Edge Function · ai-assistant
//
// Answers free-form questions about one truck's operating history. The caller
// supplies a compact JSON context assembled in the browser from data the user
// is already allowed to see, so this function never needs elevated database
// access — and the model API key never reaches the client.
//
// Deploy:  supabase functions deploy ai-assistant
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are the analyst inside FleetOps, a truck rental and fleet management system used by an owner-operator who leases one Class-8 truck to another company.

You are given a JSON snapshot of that truck's operating history: monthly income, expenses and profit, expense totals by category, recent maintenance work orders, upcoming service schedules and monthly fuel economy.

Rules:
- Answer only from the supplied data. If the data cannot support an answer, say so plainly and name what is missing.
- Be specific and quantitative. Cite the actual figures and dates from the context.
- Money is US dollars; distances are miles; fuel economy is miles per gallon.
- Keep answers under 200 words unless the user asks for detail. Use short paragraphs or a tight bulleted list.
- You are not a lawyer, accountant or tax adviser. For tax or legal questions, give the general shape of the answer and recommend the user confirm with a professional.
- Never invent maintenance history, invoices or figures.`;

interface RequestBody {
  question?: string;
  context?: unknown;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json(
      { error: 'ANTHROPIC_API_KEY is not set. Run: supabase secrets set ANTHROPIC_API_KEY=...' },
      501,
    );
  }

  // Verify the caller is a signed-in FleetOps user before spending tokens.
  const authHeader = request.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const question = (body.question ?? '').trim();
  if (!question) return json({ error: 'A question is required.' }, 400);
  if (question.length > 2000) return json({ error: 'Question is too long.' }, 400);

  const messages = [
    ...(body.history ?? []).slice(-6).map((entry) => ({
      role: entry.role,
      content: entry.content.slice(0, 4000),
    })),
    {
      role: 'user' as const,
      content: `Truck data snapshot:\n\`\`\`json\n${JSON.stringify(body.context ?? {}).slice(0, 60000)}\n\`\`\`\n\nQuestion: ${question}`,
    },
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic error', response.status, detail);
      return json({ error: `The model provider returned ${response.status}.` }, 502);
    }

    const payload = await response.json();
    const answer = (payload.content ?? [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n')
      .trim();

    return json({ answer: answer || 'No answer was produced.' });
  } catch (error) {
    console.error('ai-assistant failure', error);
    return json({ error: 'The assistant is temporarily unavailable.' }, 503);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}
