create table if not exists public.product_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_product_id uuid not null references public.project_products(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  source_image_count integer not null default 0,
  product_type text not null default '',
  category text not null default '',
  primary_color text not null default '',
  materials jsonb not null default '[]'::jsonb,
  signature_features jsonb not null default '[]'::jsonb,
  must_keep jsonb not null default '[]'::jsonb,
  can_change jsonb not null default '[]'::jsonb,
  must_not_change jsonb not null default '[]'::jsonb,
  identity_summary text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, project_product_id)
);

create trigger set_product_identity_profiles_updated_at
before update on public.product_identity_profiles
for each row
execute function public.set_updated_at();

create index if not exists idx_product_identity_profiles_project_id
on public.product_identity_profiles(project_id);

create index if not exists idx_product_identity_profiles_product_id
on public.product_identity_profiles(project_product_id);
