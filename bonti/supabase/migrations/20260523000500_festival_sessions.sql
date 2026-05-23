create table public.festival_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  persona         text,
  location_lat    double precision,
  location_lng    double precision,
  group_id        uuid,
  compass_target  jsonb,
  last_update     timestamptz not null default now()
);

create index festival_sessions_user_idx on public.festival_sessions (user_id);
create index festival_sessions_group_idx on public.festival_sessions (group_id);
