create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  user_id     uuid references auth.users(id) on delete set null,
  payload     jsonb not null,
  lang        text not null default 'en' check (lang in ('en', 'ro')),
  is_group    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index plans_session_id_idx on public.plans (session_id);
create index plans_user_id_idx on public.plans (user_id);
