/**
 * Migration Script Part 3: Import oversized runs without heavy JSONB fields
 */
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';

const CLOUD = {
    url: 'https://vbivdhuinibdsdqlldyh.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaXZkaHVpbmliZHNkcWxsZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyNTA5MSwiZXhwIjoyMDc4OTAxMDkxfQ.W3k4Z7P7AORWKnz02BQwQz-PCRkrTEnQR2WMIQ-AH-g',
};
const MONGO_URI = 'mongodb://admin:Fag%40123%24@127.0.0.1:27017/indicefaltas?authSource=admin';
const userIdMap = new Map([
    ['93b1deeb-7f6e-4c1c-9588-0345a5c0c9dc', '2c28287c-ff8c-4b4a-8f54-dbe79d16bf72'],
    ['d5f479c1-feef-470b-8bfd-9b31bcb0d4fe', 'cb574b63-094f-4a94-b067-27b864a91e85'],
    ['ed7b78fc-2a4b-45eb-9296-ab1479033cf3', '1319df84-00e7-4e16-a0da-8d306a8a8534'],
    ['8ff7a5a3-462f-4520-861a-a43e60b8ea62', 'd2994cd7-b7f8-4cc5-a418-060b36a596d8'],
]);

async function main() {
    const cloudClient = createClient(CLOUD.url, CLOUD.serviceKey);
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const db = mongoClient.db('indicefaltas');
    const runsCollection = db.collection('analise_runs');

    const existingIds = new Set(
        (await runsCollection.find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id)
    );

    const { data: allIds } = await cloudClient.from('analise_runs').select('id').order('created_at');
    const missing = (allIds || []).filter(r => !existingIds.has(r.id));
    console.log(`Runs faltando: ${missing.length}`);

    const { data: allCurvas } = await cloudClient.from('analise_runs_curvas').select('*');

    for (const { id } of missing) {
        try {
            // Fetch WITHOUT the heavy fields (consolidated, faltas, parados)
            const { data: run, error } = await cloudClient
                .from('analise_runs')
                .select('id,org_id,cliente_id,created_at,created_by,periodo_dias,periodo_inicio,periodo_fim,algoritmo_versao,path_vendas,path_inventario,summary,natasha_report,action_plan,top_faltas,top_excessos,top_parados')
                .eq('id', id)
                .single();

            if (error || !run) {
                console.error(`  ❌ ${id}:`, error?.message);
                continue;
            }

            const runCurvas = (allCurvas || []).filter(c => c.run_id === id).map(c => ({
                curva: c.curva, skus: c.skus, skus_parados: c.skus_parados, skus_em_falta: c.skus_em_falta,
                venda_90d: Number(c.venda_90d), cmv_90d: Number(c.cmv_90d), lucro_bruto_90d: Number(c.lucro_bruto_90d),
                estoque_parado_unid: Number(c.estoque_parado_unid), estoque_parado_valor: Number(c.estoque_parado_valor),
                excesso_unidades: Number(c.excesso_unidades), excesso_valor: Number(c.excesso_valor),
                dias_estoque_medio: Number(c.dias_estoque_medio), falta_percent: Number(c.falta_percent),
            }));

            await runsCollection.insertOne({
                _id: run.id, org_id: run.org_id, cliente_id: run.cliente_id,
                created_at: new Date(run.created_at), created_by: userIdMap.get(run.created_by) || run.created_by,
                periodo_dias: run.periodo_dias, periodo_inicio: run.periodo_inicio, periodo_fim: run.periodo_fim,
                algoritmo_versao: run.algoritmo_versao, path_vendas: run.path_vendas, path_inventario: run.path_inventario,
                summary: run.summary, natasha_report: run.natasha_report, action_plan: run.action_plan,
                top_faltas: run.top_faltas, top_excessos: run.top_excessos, top_parados: run.top_parados,
                consolidated: null, faltas: null, parados: null, // Skipped due to size
                curvas: runCurvas,
                _note: 'consolidated/faltas/parados omitted due to oversized payload (>17MB)'
            });
            console.log(`  ✅ ${id} (sem campos pesados)`);
        } catch (err) {
            console.error(`  ❌ ${id}:`, err.message);
        }
    }

    const total = await runsCollection.countDocuments();
    console.log(`\nTotal runs no MongoDB: ${total}`);
    await mongoClient.close();
}
main().catch(console.error);
