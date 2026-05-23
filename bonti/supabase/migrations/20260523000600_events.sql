create table public.events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  payload     jsonb not null default '{}',
  session_id  uuid,
  created_at  timestamptz not null default now()
);

create index events_type_idx on public.events (type);
create index events_created_idx on public.events (created_at desc);
