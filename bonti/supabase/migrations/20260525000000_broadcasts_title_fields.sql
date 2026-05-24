-- Bonti live broadcasts: ping rendering fields + RLS.
alter table public.broadcasts
  add column title_en text not null default '',
  add column title_ro text not null default '',
  add column deeplink text,
  add column target_venue_id text;

alter table public.broadcasts enable row level security;

-- Public read so /app clients (anon) can SELECT recent broadcasts.
create policy "broadcasts_public_read"
  on public.broadcasts for select
  using (true);

-- No insert/update/delete policies: writes go through server routes
-- using the service-role client, which bypasses RLS.
