-- Campos opcionais para registrar período analisado

alter table public.analise_runs
  add column if not exists periodo_inicio date,
  add column if not exists periodo_fim date;
