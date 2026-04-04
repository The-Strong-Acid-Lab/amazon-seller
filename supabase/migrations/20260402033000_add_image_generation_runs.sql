create table if not exists public.image_generation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  stage text not null default 'queued' check (
    stage in (
      'queued',
      'preparing_assets',
      'identifying_product',
      'generating_image',
      'reviewing_identity',
      'completed',
      'failed'
    )
  ),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  model_name text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  image_asset_id uuid references public.image_assets(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_image_generation_runs_updated_at
before update on public.image_generation_runs
for each row
execute function public.set_updated_at();

create index if not exists idx_image_generation_runs_project_id
on public.image_generation_runs(project_id);

create index if not exists idx_image_generation_runs_slot
on public.image_generation_runs(slot);

create index if not exists idx_image_generation_runs_status
on public.image_generation_runs(status);
