do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'analysis_runs'
  ) then
    alter publication supabase_realtime add table public.analysis_runs;
  end if;
end
$$;

grant select on table public.analysis_runs to anon, authenticated;

alter table public.analysis_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_runs'
      and policyname = 'analysis_runs_select_public'
  ) then
    create policy analysis_runs_select_public
      on public.analysis_runs
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
