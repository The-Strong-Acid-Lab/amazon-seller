alter table public.product_reference_images
add column if not exists reference_kind text not null default 'untyped'
  check (
    reference_kind in (
      'untyped',
      'hero_source',
      'structure_lock',
      'material_lock',
      'lifestyle_ref',
      'competitor_inspiration',
      'infographic_ignore'
    )
  );

alter table public.product_reference_images
add column if not exists pinned_for_main boolean not null default false;

create index if not exists idx_product_reference_images_reference_kind
on public.product_reference_images(reference_kind);

create index if not exists idx_product_reference_images_pinned_for_main
on public.product_reference_images(project_product_id, pinned_for_main);
