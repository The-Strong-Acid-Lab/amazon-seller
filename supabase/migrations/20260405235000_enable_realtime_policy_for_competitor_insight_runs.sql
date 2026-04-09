do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'competitor_insight_runs'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.competitor_insight_runs;
  end if;
end
$$;

grant select on table public.competitor_insight_runs to anon, authenticated;

alter table public.competitor_insight_runs enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'competitor_insight_runs'
      and policyname = 'competitor_insight_runs_select_public'
  ) then
    null;
  else
    create policy competitor_insight_runs_select_public
      on public.competitor_insight_runs
      for select
      using (true);
  end if;
end
$$;
