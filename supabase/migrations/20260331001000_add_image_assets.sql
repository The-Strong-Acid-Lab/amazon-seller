insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create table if not exists public.image_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_report_id uuid references public.analysis_reports(id) on delete set null,
  slot text not null,
  goal text not null default '',
  message text not null default '',
  supporting_proof text not null default '',
  visual_direction text not null default '',
  prompt_zh text not null default '',
  prompt_en text not null default '',
  model_name text not null default 'gpt-image-1',
  status text not null default 'generated' check (status in ('generated', 'failed')),
  storage_bucket text,
  storage_path text,
  image_url text,
  width integer,
  height integer,
  error_message text,
  is_kept boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_image_assets_updated_at
before update on public.image_assets
for each row
execute function public.set_updated_at();

create index if not exists idx_image_assets_project_id
on public.image_assets(project_id);

create index if not exists idx_image_assets_slot
on public.image_assets(slot);

create index if not exists idx_image_assets_is_kept
on public.image_assets(is_kept);
