import { createAdminClient } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";
import { reciprocalRankFusion } from "@/lib/retrieval/rrf";
import type { Lang, RetrievedChunk } from "@/types/chat";

export type HybridOptions = {
  lang?: Lang;
  k?: number;
  retrievalSize?: number;
  tags?: string[];
};

type VectorRow = {
  id: number;
  source_doc: string;
  text: string;
  lang: string;
  tags: string[];
  similarity: number;
};

type FtsRow = {
  id: number;
  source_doc: string;
  text: string;
  lang: string;
  tags: string[];
  rank: number;
};

export async function hybridRetrieve(
  query: string,
  opts: HybridOptions = {},
): Promise<RetrievedChunk[]> {
  const k = opts.k ?? 5;
  const retrievalSize = opts.retrievalSize ?? 20;
  const lang = opts.lang ?? null;
  const tagsFilter = opts.tags && opts.tags.length > 0 ? opts.tags : null;

  const supabase = createAdminClient();

  const [vectorRes, ftsRes] = await Promise.all([
    embed(query).then((vec) =>
      supabase.rpc("match_kb_chunks", {
        query_embedding: Array.from(vec),
        match_count: retrievalSize,
        filter_lang: lang,
        filter_tags: tagsFilter,
      }),
    ),
    supabase.rpc("search_kb_chunks_fts", {
      query_text: query,
      match_count: retrievalSize,
      filter_lang: lang,
    }),
  ]);

  if (vectorRes.error) throw vectorRes.error;
  if (ftsRes.error) throw ftsRes.error;

  const vectorList = ((vectorRes.data ?? []) as VectorRow[]).map((r) => ({
    id: r.id,
    source_doc: r.source_doc,
    text: r.text,
    lang: r.lang as Lang,
    tags: r.tags,
    similarity: r.similarity,
  }));

  const ftsList = ((ftsRes.data ?? []) as FtsRow[]).map((r) => ({
    id: r.id,
    source_doc: r.source_doc,
    text: r.text,
    lang: r.lang as Lang,
    tags: r.tags,
    similarity: r.rank,
  }));

  const fused = reciprocalRankFusion(
    [vectorList, ftsList],
    (x) => x.id,
    { k },
  );

  return fused;
}
