create table if not exists public.prompt_rebuild_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  stage text not null default 'queued' check (
    stage in (
      'queued',
      'analyzing_reference',
      'rebuilding_prompt',
      'completed',
      'failed'
    )
  ),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  error_message text,
  result_prompt text,
  canonical_prompt_en text,
  mismatch_notes text,
  match_score integer check (match_score is null or (match_score >= 0 and match_score <= 100)),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_prompt_rebuild_runs_updated_at
before update on public.prompt_rebuild_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_prompt_rebuild_runs_project_id
on public.prompt_rebuild_runs(project_id);

create index if not exists idx_prompt_rebuild_runs_slot
on public.prompt_rebuild_runs(slot);

create index if not exists idx_prompt_rebuild_runs_status
on public.prompt_rebuild_runs(status);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'prompt_rebuild_runs'
  ) then
    alter publication supabase_realtime add table public.prompt_rebuild_runs;
  end if;
end
$$;

grant select on table public.prompt_rebuild_runs to anon, authenticated;

alter table public.prompt_rebuild_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prompt_rebuild_runs'
      and policyname = 'prompt_rebuild_runs_select_public'
  ) then
    create policy prompt_rebuild_runs_select_public
      on public.prompt_rebuild_runs
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
