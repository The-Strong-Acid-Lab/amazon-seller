alter table public.image_strategy_slots
add column if not exists reference_image_id uuid references public.product_reference_images(id) on delete set null;

create index if not exists image_strategy_slots_reference_image_id_idx
on public.image_strategy_slots(reference_image_id);

