create table if not exists public.competitor_insight_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_product_id uuid not null references public.project_products(id) on delete cascade,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed')
  ),
  stage text not null default 'queued' check (
    stage in ('queued', 'loading_reviews', 'llm_analyzing', 'writing_insight', 'completed', 'failed')
  ),
  progress integer not null default 0,
  model_name text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_competitor_insight_runs_updated_at
before update on public.competitor_insight_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_competitor_insight_runs_project_id
on public.competitor_insight_runs(project_id);

create index if not exists idx_competitor_insight_runs_project_product_id
on public.competitor_insight_runs(project_product_id);

create index if not exists idx_competitor_insight_runs_status
on public.competitor_insight_runs(status);
