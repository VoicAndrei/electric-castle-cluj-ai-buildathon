create table public.music_matches (
  id          uuid primary key default gen_random_uuid(),
  url_hash    text not null unique,
  source      text not null check (source in ('spotify_url', 'ytmusic_url', 'apple_url', 'freeform')),
  input       jsonb not null,
  output      jsonb not null,
  created_at  timestamptz not null default now()
);
