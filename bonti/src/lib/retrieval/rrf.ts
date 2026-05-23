const RRF_K = 60;

export type FusionOptions = {
  k?: number;
  rrfConstant?: number;
};

export function reciprocalRankFusion<T>(
  lists: T[][],
  idOf: (item: T) => string | number,
  opts: FusionOptions = {},
): T[] {
  const constant = opts.rrfConstant ?? RRF_K;
  const scores = new Map<string | number, { item: T; score: number }>();

  for (const list of lists) {
    list.forEach((item, idx) => {
      const id = idOf(item);
      const rank = idx + 1;
      const inc = 1 / (constant + rank);
      const prev = scores.get(id);
      if (prev) prev.score += inc;
      else scores.set(id, { item, score: inc });
    });
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);

  return opts.k ? sorted.slice(0, opts.k) : sorted;
}
