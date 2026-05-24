-- Plan 3b-1: index the events.payload jsonb for filter queries (session_id,
-- artist_name, broadcast_id keys inside payload). Foundation already created
-- type/created_at indexes; this completes the trio.
create index if not exists events_payload_gin_idx
  on public.events using gin (payload);
