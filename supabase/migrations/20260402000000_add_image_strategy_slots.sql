create table if not exists public.image_strategy_slots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot_key text not null,
  order_index integer not null,
  section text not null check (section in ('main', 'secondary')),
  title text not null default '',
  purpose text not null default '',
  conversion_goal text not null default '',
  recommended_overlay_copy text not null default '',
  evidence text not null default '',
  visual_direction text not null default '',
  compliance_notes text not null default '',
  prompt_text text not null default '',
  source_brief_slot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, slot_key)
);

create trigger set_image_strategy_slots_updated_at
before update on public.image_strategy_slots
for each row
execute function public.set_updated_at();

create index if not exists idx_image_strategy_slots_project_id
on public.image_strategy_slots(project_id);

create index if not exists idx_image_strategy_slots_slot_key
on public.image_strategy_slots(slot_key);
