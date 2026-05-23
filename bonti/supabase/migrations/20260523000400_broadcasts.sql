create table public.broadcasts (
  id            uuid primary key default gen_random_uuid(),
  source_text   text not null,
  ai_draft_en   text,
  ai_draft_ro   text,
  final_en      text not null,
  final_ro      text not null,
  target        text not null default 'all',
  urgency       text not null default 'standard' check (urgency in ('standard', 'critical')),
  sent_by       uuid references auth.users(id) on delete set null,
  sent_at       timestamptz not null default now()
);

-- Enable Realtime publication so clients can subscribe.
alter publication supabase_realtime add table public.broadcasts;
