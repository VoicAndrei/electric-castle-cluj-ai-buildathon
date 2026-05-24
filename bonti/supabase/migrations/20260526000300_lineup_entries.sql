-- Plan 3b-2: DB-backed lineup. Replaces docs/ingest/lineup.json as source of truth.
create table public.lineup_entries (
  id          uuid primary key default gen_random_uuid(),
  artist_name text not null,
  day         text not null check (day in ('Friday','Saturday','Sunday')),
  stage       text not null,
  start_at    timestamptz null,
  end_at      timestamptz null,
  ec_tags     text[] not null default '{}',
  genres      text[] not null default '{}',
  photo_url   text null,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create unique index lineup_entries_artist_day_stage_uniq
  on public.lineup_entries (artist_name, day, stage);

create index lineup_entries_day_sort_idx
  on public.lineup_entries (day, sort_order);

alter table public.lineup_entries enable row level security;

create policy "lineup_entries_public_read"
  on public.lineup_entries for select
  using (true);

-- No anon write policy. Service-role writes only (admin API routes).

create function public.touch_lineup_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lineup_entries_touch_updated_at
  before update on public.lineup_entries
  for each row execute function public.touch_lineup_entries_updated_at();

alter publication supabase_realtime add table public.lineup_entries;
