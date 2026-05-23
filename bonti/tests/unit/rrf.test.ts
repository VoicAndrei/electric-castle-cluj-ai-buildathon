import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "@/lib/retrieval/rrf";

type Item = { id: number };

describe("reciprocalRankFusion", () => {
  it("returns items in fused order when both lists agree", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    expect(out.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("merges disagreeing lists by RRF score", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b: Item[] = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    expect(out[0].id).toBe(1);
  });

  it("dedupes items appearing in both lists", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }];
    const b: Item[] = [{ id: 1 }, { id: 3 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    const ids = out.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns top-k when k is given", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const b: Item[] = [{ id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id, { k: 2 });
    expect(out).toHaveLength(2);
  });
});
