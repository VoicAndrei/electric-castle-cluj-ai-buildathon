-- Knowledge base chunks (embedded EC content).
-- bge-m3 outputs 1024-dimensional vectors.

create table public.kb_chunks (
  id          bigserial primary key,
  source_doc  text not null,
  text        text not null,
  embedding   vector(1024) not null,
  lang        text not null default 'en' check (lang in ('en', 'ro')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index kb_chunks_embedding_ivfflat_idx
  on public.kb_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index kb_chunks_text_fts_idx
  on public.kb_chunks
  using gin (to_tsvector('simple', text));

create index kb_chunks_lang_idx on public.kb_chunks (lang);
create index kb_chunks_tags_idx on public.kb_chunks using gin (tags);
