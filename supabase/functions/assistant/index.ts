import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ASSISTANT_ID = Deno.env.get("ASSISTANT_ID") ?? "";
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RunStatus = "queued" | "in_progress" | "completed" | "failed" | "cancelled" | "requires_action";

const baseHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  "OpenAI-Beta": "assistants=v2",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);
  if (!ASSISTANT_ID) return json({ error: "Missing ASSISTANT_ID" }, 500);

  let body: { question?: string; context?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch (_err) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const question = body?.question?.trim?.();
  const context = body?.context ?? {};
  if (!question) return json({ error: "Missing 'question' in body" }, 400);

  // 1) Cria thread
  const threadResp = await fetch(`${OPENAI_BASE_URL}/threads`, { method: "POST", headers: baseHeaders });
  if (!threadResp.ok) return handleError(threadResp);
  const thread = await threadResp.json();

  // 2) Adiciona mensagem do usuário
  const addMsg = await fetch(`${OPENAI_BASE_URL}/threads/${thread.id}/messages`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      role: "user",
      content: `Pergunta: ${question}\nContexto: ${JSON.stringify(context)}`,
    }),
  });
  if (!addMsg.ok) return handleError(addMsg);

  // 3) Inicia o run do assistente
  const runResp = await fetch(`${OPENAI_BASE_URL}/threads/${thread.id}/runs`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
  });
  if (!runResp.ok) return handleError(runResp);
  const run = await runResp.json();

  // 4) Poll até completar ou falhar
  const status = await pollRun(thread.id, run.id);

  // 5) Poll curto pelas mensagens e pega somente texto do assistant
  const extractText = (msg: any): string | null => {
    for (const c of msg?.content ?? []) {
      if (c?.type === "text" && c?.text?.value) return c.text.value;
      if (c?.type === "output_text" && Array.isArray(c.output_text?.content)) {
        const t = c.output_text.content
          .map((it: any) => it?.text ?? it?.text?.value ?? it?.value)
          .find((x: any) => !!x);
        if (t) return t;
      }
    }
    return null;
  };

  let answer: string | null = null;
  for (let attempt = 0; attempt < 40 && !answer; attempt++) {
    const resp = await fetch(
      `${OPENAI_BASE_URL}/threads/${thread.id}/messages?order=desc&limit=50`,
      { headers: baseHeaders },
    );
    if (!resp.ok) return handleError(resp);
    const data = await resp.json();
    answer =
      (data.data ?? [])
        .filter((m: any) => m.role === "assistant")
        .map(extractText)
        .find((t: any) => !!t) ?? null;

    if (!answer) await delay(2000);
  }

  if (!answer) {
    return json(
      { error: "Assistant response not available after polling; try again.", threadId: thread.id, status },
      502,
    );
  }
  return json({ answer, threadId: thread.id, status });
});

async function pollRun(threadId: string, runId: string): Promise<RunStatus> {
  let status: RunStatus = "queued";
  for (let attempt = 0; attempt < 20; attempt++) {
    const resp = await fetch(`${OPENAI_BASE_URL}/threads/${threadId}/runs/${runId}`, { headers: baseHeaders });
    if (!resp.ok) return "failed";
    const data = await resp.json();
    status = data.status;
    if (status === "completed" || status === "failed" || status === "cancelled") break;
    await delay(1000);
  }
  return status;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleError(resp: Response): Promise<Response> {
  const text = await resp.text();
  console.error("Assistant function error:", text);
  return json({ error: text }, resp.status);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
