-- Plan 3b-1: events table needs RLS — foundation migration didn't enable it.
-- Service-role bypasses RLS, so /api/events route inserts still work.
alter table public.events enable row level security;
-- No policies at all = no anonymous read or write.
