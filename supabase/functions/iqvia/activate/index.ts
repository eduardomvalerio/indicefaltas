import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "POST") return j(405, { error: "Method not allowed" });
    const { org_id, batch_id } = await req.json();
    if (!org_id || !batch_id) return j(400, { error: "org_id and batch_id are required" });

    const s = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: e1 } = await s.from("iqvia_batches").update({ is_active: false }).eq("org_id", org_id);
    if (e1) throw e1;

    const { error: e2 } = await s.from("iqvia_batches").update({ is_active: true }).eq("org_id", org_id).eq("id", batch_id);
    if (e2) throw e2;

    return j(200, { ok: true });
  } catch (err) {
    return j(500, { ok: false, error: String(err) });
  }
});

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
