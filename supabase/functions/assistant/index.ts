import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    return json({ error: 'Missing OPENAI_API_KEY' }, 500);
  }

  let body: { question?: string; context?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch (_err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const question = body?.question?.trim?.();
  const context = body?.context ?? {};
  if (!question) {
    return json({ error: "Missing 'question' in body" }, 400);
  }

  const prompt = [
    'Você é um consultor especialista em gestão de estoque farmacêutico.',
    'Responda em português do Brasil com linguagem clara e prática.',
    'Responda em Markdown limpo.',
    'Use títulos com "###" para seções.',
    'Estruture a resposta em: Resumo executivo, Diagnóstico, Ações recomendadas e OKRs.',
    'Não use tabela no formato pipe (com "|"). Para plano de ação, use lista numerada simples (1..5), um item por linha.',
    `Pergunta: ${question}`,
    `Contexto JSON: ${JSON.stringify(context)}`,
  ].join('\n\n');

  const openaiResp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 1600,
      messages: [
        {
          role: 'system',
          content: 'Você é um analista sênior de farmácias focado em decisões objetivas.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!openaiResp.ok) {
    const errText = await openaiResp.text();
    console.error('assistant/openai error:', errText);
    return json({ error: errText }, openaiResp.status);
  }

  const completion = await openaiResp.json();
  const answer = completion?.choices?.[0]?.message?.content?.trim?.();
  if (!answer) {
    return json({ error: 'Empty assistant response' }, 502);
  }

  return json({ answer, status: 'completed' });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
