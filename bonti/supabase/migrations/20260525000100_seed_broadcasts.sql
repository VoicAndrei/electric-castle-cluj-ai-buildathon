-- Seed two historical broadcasts so /app/notifications and live-ticker
-- have content on first load. Idempotent via fixed UUIDs.
insert into public.broadcasts
  (id, source_text, final_en, final_ro, title_en, title_ro, sent_at)
values
  ('00000000-0000-0000-0000-000000000001',
   'Road back full after Timberlake',
   '⚡ Road back is full after Timberlake. Shuttle paused till 3. Stay — set at The Beach, after at Hangar.',
   '⚡ Drumul înapoi e plin după Timberlake. Shuttle-ul revine la 3. Stai la festival — e un set la The Beach și un after la Hangar.',
   'Shuttle paused',
   'Shuttle-ul stă pe loc',
   '2026-07-18T19:45:00+03:00'),
  ('00000000-0000-0000-0000-000000000002',
   'Booha running late',
   'Booha set running 10 min late.',
   'Booha întârzie 10 minute.',
   'Booha 10 min late',
   'Booha la 10 min',
   '2026-07-18T20:30:00+03:00')
on conflict (id) do nothing;
