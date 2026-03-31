create table if not exists public.listing_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_report_id uuid references public.analysis_reports(id) on delete set null,
  title_draft text not null default '',
  bullet_drafts jsonb not null default '[]'::jsonb,
  positioning_statement text not null default '',
  source text not null default 'analysis_draft',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_listing_snapshots_project_id
on public.listing_snapshots(project_id);

create index if not exists idx_listing_snapshots_created_at
on public.listing_snapshots(created_at desc);
