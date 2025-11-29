-- Permite excluir runs da própria organização
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analise_runs'
      and policyname = 'Delete runs for own org'
  ) then
    create policy "Delete runs for own org"
      on public.analise_runs
      for delete
      to authenticated
      using (org_id = public.current_org_id());
  end if;
end$$;
