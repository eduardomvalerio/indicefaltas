import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "GET") return r(405, { error: "Method not allowed" });
    const url = new URL(req.url);
    const org_id = url.searchParams.get("org_id");
    const uf = url.searchParams.get("uf");
    if (!org_id) return r(400, { error: "org_id required" });

    const s = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let q = s.from("market_state_stores").select("estado, uf, lojas").eq("org_id", org_id);
    if (uf) q = q.eq("uf", uf);
    const { data, error } = await q;
    if (error) throw error;
    return r(200, { ok: true, items: data });
  } catch (err) {
    return r(500, { ok: false, error: String(err) });
  }
});

function r(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
