CREATE TABLE IF NOT EXISTS artist_blurbs (
  artist_name text not null,
  lang        text not null check (lang in ('en','ro')),
  blurb       text not null,
  created_at  timestamptz not null default now(),
  primary key (artist_name, lang)
);

-- Allow service-role writes from API routes; reads from anon for simplicity (no PII).
alter table artist_blurbs enable row level security;
create policy artist_blurbs_select_all on artist_blurbs for select using (true);
