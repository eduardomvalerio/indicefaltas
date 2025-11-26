-- Schema inicial para o app "Análise de Farmácia"
-- Cria entidades básicas (organizações, clientes e execuções),
-- além das políticas de RLS usadas pelo frontend.

create extension if not exists "pgcrypto";

-- ------------------------------
-- Função utilitária: retorna a org do usuário autenticado
-- ------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select org_id
  from public.org_members
  where user_id = auth.uid()
  order by created_at desc
  limit 1;
$$;

grant execute on function public.current_org_id to authenticated, anon, service_role;

-- ------------------------------
-- Tabela: orgs
-- ------------------------------
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.orgs enable row level security;

create policy "Org members can read their org"
  on public.orgs
  for select
  to authenticated
  using (id in (select org_id from public.org_members where user_id = auth.uid()));

-- ------------------------------
-- Tabela: org_members
-- ------------------------------
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'colaborador' check (role in ('admin','colaborador')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

alter table public.org_members enable row level security;

create policy "User can read own memberships"
  on public.org_members
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role manages memberships"
  on public.org_members
  for all
  to service_role
  using (true)
  with check (true);

-- ------------------------------
-- Tabela: clientes
-- ------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  cnpj text,
  nome_fantasia text not null,
  cidade text,
  uf text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clientes_org on public.clientes(org_id);

alter table public.clientes enable row level security;

create policy "Read clients from own org"
  on public.clientes
  for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "Modify clients inside own org"
  on public.clientes
  for insert, update, delete
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ------------------------------
-- Tabela: analise_runs
-- ------------------------------
create table if not exists public.analise_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  periodo_dias integer not null default 90,
  algoritmo_versao text not null,
  path_vendas text,
  path_inventario text,
  summary jsonb not null
);

create index if not exists idx_runs_org on public.analise_runs(org_id);
create index if not exists idx_runs_cliente on public.analise_runs(cliente_id);

alter table public.analise_runs enable row level security;

create policy "Read runs from own org"
  on public.analise_runs
  for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "Insert runs for own org"
  on public.analise_runs
  for insert
  to authenticated
  with check (org_id = public.current_org_id());

-- ------------------------------
-- Tabela: analise_runs_curvas
-- ------------------------------
create table if not exists public.analise_runs_curvas (
  id bigserial primary key,
  run_id uuid not null references public.analise_runs(id) on delete cascade,
  curva text not null check (curva in ('A','B','C','SEM_GIRO')),
  skus integer not null default 0,
  skus_parados integer not null default 0,
  skus_em_falta integer not null default 0,
  venda_90d numeric not null default 0,
  cmv_90d numeric not null default 0,
  lucro_bruto_90d numeric not null default 0,
  estoque_parado_unid numeric not null default 0,
  estoque_parado_valor numeric not null default 0,
  excesso_unidades numeric not null default 0,
  excesso_valor numeric not null default 0,
  dias_estoque_medio numeric not null default 0,
  falta_percent numeric not null default 0
);

create index if not exists idx_curvas_run on public.analise_runs_curvas(run_id);

alter table public.analise_runs_curvas enable row level security;

create policy "Access curvas for runs in own org"
  on public.analise_runs_curvas
  for select
  to authenticated
  using (
    exists (
      select 1 from public.analise_runs r
      where r.id = run_id and r.org_id = public.current_org_id()
    )
  );

create policy "Insert curvas for runs in own org"
  on public.analise_runs_curvas
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analise_runs r
      where r.id = run_id and r.org_id = public.current_org_id()
    )
  );
