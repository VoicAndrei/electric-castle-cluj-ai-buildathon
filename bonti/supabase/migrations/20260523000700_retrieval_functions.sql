-- Hybrid retrieval: vector cosine similarity, filtered by lang and tags.
create or replace function public.match_kb_chunks (
  query_embedding vector(1024),
  match_count int default 20,
  filter_lang text default null,
  filter_tags text[] default null
)
returns table (
  id bigint,
  source_doc text,
  text text,
  lang text,
  tags text[],
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.source_doc,
    c.text,
    c.lang,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where (filter_lang is null or c.lang = filter_lang)
    and (filter_tags is null or c.tags && filter_tags)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Full-text retrieval over the same chunks.
create or replace function public.search_kb_chunks_fts (
  query_text text,
  match_count int default 20,
  filter_lang text default null
)
returns table (
  id bigint,
  source_doc text,
  text text,
  lang text,
  tags text[],
  rank float
)
language sql stable
as $$
  select
    c.id,
    c.source_doc,
    c.text,
    c.lang,
    c.tags,
    ts_rank(to_tsvector('simple', c.text), plainto_tsquery('simple', query_text)) as rank
  from public.kb_chunks c
  where (filter_lang is null or c.lang = filter_lang)
    and to_tsvector('simple', c.text) @@ plainto_tsquery('simple', query_text)
  order by rank desc
  limit match_count;
$$;
