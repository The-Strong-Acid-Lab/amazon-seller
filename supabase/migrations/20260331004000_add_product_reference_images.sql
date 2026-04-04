insert into storage.buckets (id, name, public)
values ('product-reference-images', 'product-reference-images', true)
on conflict (id) do nothing;

create table if not exists public.product_reference_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_product_id uuid not null references public.project_products(id) on delete cascade,
  role text not null check (role in ('target', 'competitor')),
  file_name text not null,
  file_hash text not null,
  storage_bucket text not null default 'product-reference-images',
  storage_path text not null,
  image_url text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, project_product_id, file_hash)
);

create index if not exists idx_product_reference_images_project_id
on public.product_reference_images(project_id);

create index if not exists idx_product_reference_images_project_product_id
on public.product_reference_images(project_product_id);

create index if not exists idx_product_reference_images_role
on public.product_reference_images(role);
