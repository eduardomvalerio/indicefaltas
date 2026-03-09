/**
 * Migration Script: Supabase Cloud → MongoDB + Supabase Self-Hosted
 * 
 * 1. Exports all data from Supabase Cloud (orgs, org_members, clientes, analise_runs, analise_runs_curvas)
 * 2. Creates users in Supabase Self-Hosted
 * 3. Imports restructured data into MongoDB
 */

import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';

// === CONFIG ===
const CLOUD = {
  url: 'https://vbivdhuinibdsdqlldyh.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaXZkaHVpbmliZHNkcWxsZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyNTA5MSwiZXhwIjoyMDc4OTAxMDkxfQ.W3k4Z7P7AORWKnz02BQwQz-PCRkrTEnQR2WMIQ-AH-g',
};

const SELF_HOSTED = {
  url: 'https://supabase.farmaciaautogerenciavel.com',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.tBOiZoe8TxmoY7xF-CIWuRwtaGH3lNPwNiCDvV7yA24',
};

const MONGO_URI = 'mongodb://admin:Fag%40123%24@127.0.0.1:27017/indicefaltas?authSource=admin';

async function main() {
  console.log('🚀 Iniciando migração...\n');

  // --- 1. Connect to all services ---
  const cloudClient = createClient(CLOUD.url, CLOUD.serviceKey);
  const selfHostedClient = createClient(SELF_HOSTED.url, SELF_HOSTED.serviceKey);
  const mongoClient = new MongoClient(MONGO_URI);
  
  await mongoClient.connect();
  console.log('✅ Conectado ao MongoDB');
  
  const db = mongoClient.db('indicefaltas');

  // --- 2. Export data from Supabase Cloud ---
  console.log('\n📦 Exportando dados do Supabase Cloud...');

  const { data: orgs } = await cloudClient.from('orgs').select('*');
  console.log(`  Orgs: ${orgs?.length}`);

  const { data: orgMembers } = await cloudClient.from('org_members').select('*');
  console.log(`  Org Members: ${orgMembers?.length}`);

  const { data: clientes } = await cloudClient.from('clientes').select('*');
  console.log(`  Clientes: ${clientes?.length}`);

  // Fetch runs in batches (may have large JSONB fields)
  const allRuns = [];
  let page = 0;
  const pageSize = 20;
  while (true) {
    const { data: runs } = await cloudClient
      .from('analise_runs')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('created_at', { ascending: true });
    if (!runs || runs.length === 0) break;
    allRuns.push(...runs);
    page++;
  }
  console.log(`  Analise Runs: ${allRuns.length}`);

  const { data: curvas } = await cloudClient.from('analise_runs_curvas').select('*');
  console.log(`  Curvas: ${curvas?.length}`);

  // Export users
  const { data: usersData } = await cloudClient.auth.admin.listUsers({ page: 1, perPage: 100 });
  const users = usersData?.users || [];
  console.log(`  Users: ${users.length}`);

  // --- 3. Create users in Supabase Self-Hosted ---
  console.log('\n👤 Criando usuários no Supabase Self-Hosted...');
  const userIdMap = new Map(); // old_id -> new_id

  for (const user of users) {
    try {
      // Create with a temp password (user will need to reset)
      const { data, error } = await selfHostedClient.auth.admin.createUser({
        email: user.email,
        password: 'TempPassword123!', // temporary - user should reset
        email_confirm: true,
        user_metadata: user.user_metadata || {},
      });

      if (error) {
        if (error.message?.includes('already been registered')) {
          // User already exists, find their ID
          const { data: existingUsers } = await selfHostedClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existing = existingUsers?.users?.find(u => u.email === user.email);
          if (existing) {
            userIdMap.set(user.id, existing.id);
            console.log(`  ⚠️  ${user.email} já existe (${existing.id})`);
          }
        } else {
          console.error(`  ❌ Erro ao criar ${user.email}:`, error.message);
        }
      } else if (data?.user) {
        userIdMap.set(user.id, data.user.id);
        console.log(`  ✅ ${user.email} → ${data.user.id}`);
      }
    } catch (err) {
      console.error(`  ❌ Exceção ao criar ${user.email}:`, err);
    }
  }

  // --- 4. Import into MongoDB ---
  console.log('\n📥 Importando dados no MongoDB...');

  // Drop existing collections if they exist
  const existingCollections = await db.listCollections().toArray();
  for (const col of existingCollections) {
    if (['orgs', 'clientes', 'analise_runs', 'usuarios_app'].includes(col.name)) {
      await db.collection(col.name).drop();
      console.log(`  🗑️  Dropped collection: ${col.name}`);
    }
  }

  // 4a. Orgs (with members embedded)
  const orgsCollection = db.collection('orgs');
  for (const org of (orgs || [])) {
    const members = (orgMembers || [])
      .filter(m => m.org_id === org.id)
      .map(m => ({
        user_id: userIdMap.get(m.user_id) || m.user_id,
        old_user_id: m.user_id,
        role: m.role,
        created_at: new Date(m.created_at),
      }));

    await orgsCollection.insertOne({
      _id: org.id,
      name: org.name,
      created_at: org.created_at ? new Date(org.created_at) : new Date(),
      members,
    });
  }
  console.log(`  ✅ Orgs importadas: ${orgs?.length}`);

  // 4b. Clientes
  const clientesCollection = db.collection('clientes');
  for (const cliente of (clientes || [])) {
    await clientesCollection.insertOne({
      _id: cliente.id,
      org_id: cliente.org_id,
      cnpj: cliente.cnpj || null,
      nome_fantasia: cliente.nome_fantasia,
      cidade: cliente.cidade || null,
      uf: cliente.uf || null,
      created_at: cliente.created_at ? new Date(cliente.created_at) : new Date(),
    });
  }
  await clientesCollection.createIndex({ org_id: 1 });
  console.log(`  ✅ Clientes importados: ${clientes?.length}`);

  // 4c. Analise Runs (with curvas embedded)
  const runsCollection = db.collection('analise_runs');
  for (const run of allRuns) {
    const runCurvas = (curvas || [])
      .filter(c => c.run_id === run.id)
      .map(c => ({
        curva: c.curva,
        skus: c.skus,
        skus_parados: c.skus_parados,
        skus_em_falta: c.skus_em_falta,
        venda_90d: Number(c.venda_90d),
        cmv_90d: Number(c.cmv_90d),
        lucro_bruto_90d: Number(c.lucro_bruto_90d),
        estoque_parado_unid: Number(c.estoque_parado_unid),
        estoque_parado_valor: Number(c.estoque_parado_valor),
        excesso_unidades: Number(c.excesso_unidades),
        excesso_valor: Number(c.excesso_valor),
        dias_estoque_medio: Number(c.dias_estoque_medio),
        falta_percent: Number(c.falta_percent),
      }));

    await runsCollection.insertOne({
      _id: run.id,
      org_id: run.org_id,
      cliente_id: run.cliente_id,
      created_at: run.created_at ? new Date(run.created_at) : new Date(),
      created_by: userIdMap.get(run.created_by) || run.created_by,
      old_created_by: run.created_by,
      periodo_dias: run.periodo_dias,
      periodo_inicio: run.periodo_inicio || null,
      periodo_fim: run.periodo_fim || null,
      algoritmo_versao: run.algoritmo_versao,
      path_vendas: run.path_vendas || null,
      path_inventario: run.path_inventario || null,
      summary: run.summary,
      natasha_report: run.natasha_report || null,
      action_plan: run.action_plan || null,
      top_faltas: run.top_faltas || null,
      top_excessos: run.top_excessos || null,
      top_parados: run.top_parados || null,
      consolidated: run.consolidated || null,
      faltas: run.faltas || null,
      parados: run.parados || null,
      curvas: runCurvas,
    });
  }
  await runsCollection.createIndex({ org_id: 1 });
  await runsCollection.createIndex({ cliente_id: 1 });
  await runsCollection.createIndex({ created_at: -1 });
  console.log(`  ✅ Analise Runs importados: ${allRuns.length}`);

  // 4d. Usuarios App
  const usuariosCollection = db.collection('usuarios_app');
  for (const [oldId, newId] of userIdMap) {
    await usuariosCollection.insertOne({
      auth_user_id: newId,
      old_auth_user_id: oldId,
      is_root: true, // All current users are admins
      created_at: new Date(),
    });
  }
  console.log(`  ✅ Usuarios App importados: ${userIdMap.size}`);

  // --- 5. Summary ---
  console.log('\n🎉 Migração concluída!');
  console.log('Resumo:');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name}: ${count} documentos`);
  }

  console.log('\n📋 Mapeamento de User IDs (old → new):');
  for (const [old, newId] of userIdMap) {
    console.log(`  ${old} → ${newId}`);
  }

  await mongoClient.close();
  console.log('\n✅ Conexões encerradas.');
}

main().catch(console.error);
