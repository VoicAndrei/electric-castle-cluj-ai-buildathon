-- Real EC12 lineup has Thursday artists too (Kneecap, Sleaford Mods, etc).
-- Relax the day check to include Thursday.
alter table public.lineup_entries
  drop constraint if exists lineup_entries_day_check;

alter table public.lineup_entries
  add constraint lineup_entries_day_check
  check (day in ('Thursday','Friday','Saturday','Sunday'));
