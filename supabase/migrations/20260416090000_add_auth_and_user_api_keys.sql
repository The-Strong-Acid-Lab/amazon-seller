alter table public.projects
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_user_id
on public.projects(user_id);

create table if not exists public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  openai_key_encrypted text,
  openai_key_last4 text,
  gemini_key_encrypted text,
  gemini_key_last4 text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_user_api_keys_updated_at
before update on public.user_api_keys
for each row
execute function public.set_updated_at();
