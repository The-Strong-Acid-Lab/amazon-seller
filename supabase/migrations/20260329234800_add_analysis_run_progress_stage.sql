alter table public.analysis_runs
add column if not exists progress integer not null default 0
check (progress >= 0 and progress <= 100);

alter table public.analysis_runs
add column if not exists stage text not null default 'queued'
check (
  stage in (
    'queued',
    'normalizing',
    'loading_reviews',
    'llm_analyzing',
    'writing_report',
    'completed',
    'failed'
  )
);

update public.analysis_runs
set progress = case
  when status = 'completed' then 100
  when status = 'running' then greatest(progress, 5)
  else progress
end,
stage = case
  when status = 'completed' then 'completed'
  when status = 'failed' then 'failed'
  when status = 'running' and stage = 'queued' then 'loading_reviews'
  else stage
end;
