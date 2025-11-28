-- Coluna para armazenar top parados (JSON)

alter table public.analise_runs
  add column if not exists top_parados jsonb;
