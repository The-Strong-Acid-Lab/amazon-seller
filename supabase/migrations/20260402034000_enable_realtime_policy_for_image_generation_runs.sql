do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'image_generation_runs'
  ) then
    alter publication supabase_realtime add table public.image_generation_runs;
  end if;
end
$$;

grant select on table public.image_generation_runs to anon, authenticated;

alter table public.image_generation_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'image_generation_runs'
      and policyname = 'image_generation_runs_select_public'
  ) then
    create policy image_generation_runs_select_public
      on public.image_generation_runs
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
