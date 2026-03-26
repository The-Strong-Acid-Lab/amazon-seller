create table if not exists public.project_product_insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_product_id uuid not null references public.project_products(id) on delete cascade,
  insight_type text not null check (insight_type in ('competitor_overview')),
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_product_id, insight_type)
);

create trigger set_project_product_insights_updated_at
before update on public.project_product_insights
for each row
execute function public.set_updated_at();

create index if not exists idx_project_product_insights_project_id
on public.project_product_insights(project_id);

create index if not exists idx_project_product_insights_project_product_id
on public.project_product_insights(project_product_id);

create index if not exists idx_project_product_insights_insight_type
on public.project_product_insights(insight_type);
