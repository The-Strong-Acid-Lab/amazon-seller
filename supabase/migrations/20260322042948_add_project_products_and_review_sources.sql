create table if not exists public.project_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('target', 'competitor')),
  name text,
  asin text,
  product_url text,
  market text,
  is_launched boolean not null default true,
  current_title text,
  current_bullets text,
  current_description text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_project_products_updated_at
before update on public.project_products
for each row
execute function public.set_updated_at();

alter table public.import_files
add column if not exists project_product_id uuid references public.project_products(id) on delete set null;

alter table public.reviews
add column if not exists project_product_id uuid references public.project_products(id) on delete set null;

create index if not exists idx_project_products_project_id
on public.project_products(project_id);

create index if not exists idx_project_products_role
on public.project_products(role);

create index if not exists idx_project_products_asin
on public.project_products(asin);

create index if not exists idx_import_files_project_product_id
on public.import_files(project_product_id);

create index if not exists idx_reviews_project_product_id
on public.reviews(project_product_id);
