-- Adiciona coluna para armazenar relatório da Natasha e política de update

alter table public.analise_runs
  add column if not exists natasha_report text;

-- Permite atualizar runs da própria organização (necessário para salvar natasha_report)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analise_runs'
      and policyname = 'Update runs for own org'
  ) then
    create policy "Update runs for own org"
      on public.analise_runs
      for update
      to authenticated
      using (org_id = public.current_org_id())
      with check (org_id = public.current_org_id());
  end if;
end$$;
