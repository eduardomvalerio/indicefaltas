-- Colunas para armazenar top faltas e top excessos (JSON)

alter table public.analise_runs
  add column if not exists top_faltas jsonb,
  add column if not exists top_excessos jsonb;
