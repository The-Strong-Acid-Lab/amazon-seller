alter table public.product_identity_profiles
add column if not exists reference_signature text not null default '';
