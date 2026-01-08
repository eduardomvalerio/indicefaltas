import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type MarketRow = {
  org_id: string;
  batch_id: string;
  uf: string;
  ean: string;
  produto?: string | null;
  fabricante?: string | null;
  grupo?: string | null;
  mat_rank?: number | null;
  mat_valor?: number | null;
  mes_valor?: number | null;
  mat_participacao?: number | null;
  mat_evolucao_pct?: number | null;
};

type StateStoresRow = {
  org_id: string;
  batch_id: string;
  estado: string;
  uf: string;
  lojas: number;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });
    const form = await req.formData();
    const org_id = String(form.get("org_id") || "");
    const referencia = String(form.get("referencia") || "");
    const file = form.get("file") as File | null;
    if (!org_id || !referencia || !file) {
      return json(400, { error: "org_id, referencia e file são obrigatórios" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const storagePath = `iqvia/${org_id}/${referencia}.xlsx`;
    try {
      await supabase.storage.from("iqvia").upload(storagePath, bytes, {
        upsert: true,
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (_e) {
      /* bucket opcional */
    }

    const { data: batch, error: eBatch } = await supabase
      .from("iqvia_batches")
      .insert({ org_id, referencia, arquivo: storagePath, is_active: false })
      .select("id")
      .single();
    if (eBatch) throw eBatch;
    const batch_id = batch.id as string;

    const wb = XLSX.read(bytes, { type: "array" });

    // 1) Produtos por UF
    const marketRows: MarketRow[] = [];
    const ufSheetRegex = /^1\./i;
    for (const name of wb.SheetNames) {
      if (!ufSheetRegex.test(name) && !/UF/i.test(name)) continue;
      const ws = wb.Sheets[name];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: null, raw: true });

      for (const r of rows) {
        const uf = asUF(r["UF"] ?? r["uf"]);
        const ean = asText(r["EAN"] ?? r["Código EAN"] ?? r["ean"]);
        if (!uf || !ean) continue;

        marketRows.push({
          org_id,
          batch_id,
          uf,
          ean,
          produto: asText(r["Produto"] ?? r["Descrição"]),
          fabricante: asText(r["Fabricante"]),
          grupo: asText(r["Grupo"] ?? r["Classe"] ?? r["Categoria"]),
          mat_rank: asInt(r["MAT Rank"] ?? r["Rank MAT"]),
          mat_valor: asNum(r["MAT (R$)"] ?? r["MAT Valor"] ?? r["MAT"]),
          mes_valor: asNum(r["Mês (R$)"] ?? r["Valor Mês"] ?? r["Mês"]),
          mat_participacao: asFrac(r["MAT % Part"] ?? r["% Part MAT"]),
          mat_evolucao_pct: asFrac(r["MAT % Evol"] ?? r["% Evol MAT"]),
        });
      }
    }
    if (marketRows.length) await bulkInsert(supabase, "market_products", marketRows, 800);

    // 2) Lojas por Estado
    const storesRows: StateStoresRow[] = [];
    const netSheet = wb.Sheets["Redes e Lojas"] || wb.Sheets["Redes & Lojas"];
    if (netSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(netSheet, { defval: null, raw: true });
      for (const r of rows) {
        const estado = asText(r["Estado"]);
        const lojas = asInt(r["Loja Associada"] ?? r["Qtd Lojas"] ?? r["Lojas"]);
        const uf = estadoToUF(estado);
        if (!estado || !uf || !Number.isFinite(lojas)) continue;
        storesRows.push({ org_id, batch_id, estado, uf, lojas });
      }
      if (storesRows.length) await bulkInsert(supabase, "market_state_stores", storesRows, 800);
    }

    return json(200, {
      ok: true,
      batch_id,
      referencia,
      inserted_market_products: marketRows.length,
      inserted_state_stores: storesRows.length,
    });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function bulkInsert(supabase: any, table: string, rows: any[], chunk = 1000) {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).insert(slice);
    if (error) throw error;
  }
}

function asText(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function asInt(v: any): number | null {
  const n = Number(String(v).replace(/\D+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asFrac(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (/%$/.test(s)) {
    const n = asNum(s.replace(/%/g, ""));
    return n === null ? null : n / 100;
  }
  const n = asNum(s);
  if (n === null) return null;
  return n > 1.5 ? n / 100 : n;
}

function asUF(v: any): string | null {
  const s = asText(v);
  if (!s) return null;
  const u = s.slice(0, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(u) ? u : null;
}

function estadoToUF(estado?: string | null): string {
  const map: Record<string, string> = {
    ACRE: "AC",
    ALAGOAS: "AL",
    AMAPÁ: "AP",
    AMAPA: "AP",
    AMAZONAS: "AM",
    BAHIA: "BA",
    CEARÁ: "CE",
    CEARA: "CE",
    DISTRITO FEDERAL: "DF",
    "ESPÍRITO SANTO": "ES",
    "ESPIRITO SANTO": "ES",
    GOIÁS: "GO",
    GOIAS: "GO",
    "MARANHÃO": "MA",
    MARANHAO: "MA",
    "MATO GROSSO": "MT",
    "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG",
    PARÁ: "PA",
    PARA: "PA",
    PARAÍBA: "PB",
    PARAIBA: "PB",
    PARANÁ: "PR",
    PARANA: "PR",
    PERNAMBUCO: "PE",
    PIAUÍ: "PI",
    PIAUI: "PI",
    "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS",
    RONDÔNIA: "RO",
    RONDONIA: "RO",
    RORAIMA: "RR",
    "SANTA CATARINA": "SC",
    "SÃO PAULO": "SP",
    SAO PAULO: "SP",
    SERGIPE: "SE",
    TOCANTINS: "TO",
  };
  if (!estado) return "";
  const key = estado.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, uf] of Object.entries(map)) {
    const kk = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (kk === key) return uf;
  }
  return "";
}
