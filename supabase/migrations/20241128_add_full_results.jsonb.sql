-- Armazena resultados completos da análise (opcionais)
alter table public.analise_runs
  add column if not exists consolidated jsonb,
  add column if not exists faltas jsonb,
  add column if not exists parados jsonb;
