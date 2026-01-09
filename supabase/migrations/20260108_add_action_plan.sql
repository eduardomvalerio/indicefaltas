-- Adiciona plano de ação/alertas gerados após análise
alter table public.analise_runs
  add column if not exists action_plan jsonb;
