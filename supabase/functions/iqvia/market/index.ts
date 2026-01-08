import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "GET") return j(405, { error: "Method not allowed" });
    const url = new URL(req.url);
    const org_id = url.searchParams.get("org_id");
    const cliente_id = url.searchParams.get("cliente_id");
    const ufParam = url.searchParams.get("uf");
    const fabricante = url.searchParams.get("fabricante");
    const grupo = url.searchParams.get("grupo");
    const limit = Number(url.searchParams.get("limit") ?? "500");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    if (!org_id || (!cliente_id && !ufParam)) return j(400, { error: "org_id and (cliente_id or uf) are required" });

    const s = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let uf = ufParam;
    if (!uf) {
      const { data: cli, error: eCli } = await s
        .from("clientes")
        .select("uf")
        .eq("org_id", org_id)
        .eq("id", cliente_id)
        .single();
      if (eCli) throw eCli;
      uf = cli.uf;
    }

    let q = s
      .from("v_market_products_active")
      .select("uf, ean, produto, fabricante, grupo, mat_rank, mat_valor, mes_valor, mat_participacao, mat_evolucao_pct")
      .eq("org_id", org_id)
      .eq("uf", uf)
      .order("mat_rank", { ascending: true })
      .range(offset, offset + limit - 1);
    if (fabricante) q = q.ilike("fabricante", `%${fabricante}%`);
    if (grupo) q = q.ilike("grupo", `%${grupo}%`);

    const { data, error } = await q;
    if (error) throw error;
    return j(200, { ok: true, uf, count: data?.length ?? 0, items: data });
  } catch (err) {
    return j(500, { ok: false, error: String(err) });
  }
});

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
