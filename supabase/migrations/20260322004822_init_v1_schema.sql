create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seller_name text,
  product_name text,
  target_market text,
  target_asin text,
  status text not null default 'draft' check (
    status in ('draft', 'ready', 'analyzing', 'completed', 'failed')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create table if not exists public.import_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  source_kind text not null default 'review_export',
  sheet_name text,
  storage_path text,
  import_status text not null default 'uploaded' check (
    import_status in ('uploaded', 'parsed', 'normalized', 'failed')
  ),
  row_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  import_file_id uuid not null references public.import_files(id) on delete cascade,
  asin text,
  model text,
  review_title text not null default '',
  review_body text not null default '',
  rating integer check (rating between 1 and 5),
  review_date date,
  country text,
  is_verified_purchase boolean not null default false,
  is_vine boolean not null default false,
  helpful_count integer,
  image_count integer not null default 0,
  has_video boolean not null default false,
  review_url text,
  reviewer_name text,
  reviewer_profile_url text,
  influencer_program_url text,
  raw_row_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  position integer not null default 0
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_type text not null default 'voc_report',
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed')
  ),
  model_name text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  report_version text not null default 'v1',
  summary_json jsonb not null default '{}'::jsonb,
  strategy_json jsonb not null default '{}'::jsonb,
  export_text text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_import_files_project_id
on public.import_files(project_id);

create index if not exists idx_import_files_import_status
on public.import_files(import_status);

create index if not exists idx_reviews_project_id
on public.reviews(project_id);

create index if not exists idx_reviews_import_file_id
on public.reviews(import_file_id);

create index if not exists idx_reviews_asin
on public.reviews(asin);

create index if not exists idx_reviews_rating
on public.reviews(rating);

create index if not exists idx_reviews_review_date
on public.reviews(review_date);

create index if not exists idx_review_media_review_id
on public.review_media(review_id);

create index if not exists idx_analysis_runs_project_id
on public.analysis_runs(project_id);

create index if not exists idx_analysis_runs_status
on public.analysis_runs(status);

create index if not exists idx_analysis_reports_project_id
on public.analysis_reports(project_id);

create index if not exists idx_analysis_reports_analysis_run_id
on public.analysis_reports(analysis_run_id);
