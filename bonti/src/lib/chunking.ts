export type ChunkOptions = {
  maxTokens: number;
  overlap: number;
};

/**
 * Approximate-token chunker for markdown/text.
 * Uses whitespace token count as a proxy (1 word ≈ 1.3 tokens for EN/RO).
 */
export function chunkText(text: string, opts: ChunkOptions): string[] {
  const { maxTokens, overlap } = opts;
  if (!text.trim()) return [];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxTokens) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    const slice = words.slice(start, end).join(" ");
    chunks.push(slice.trim());
    if (end === words.length) break;
    start = end - overlap;
    if (start <= 0) start = end;
  }
  return chunks;
}
