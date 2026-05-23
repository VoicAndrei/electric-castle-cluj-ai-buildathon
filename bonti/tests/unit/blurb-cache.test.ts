import { describe, it, expect, vi } from "vitest";
import { getCachedBlurb, saveBlurb } from "@/lib/festival/blurb-cache";

function fakeSupabase(rows: Array<{ artist_name: string; lang: string; blurb: string }> = []) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((_col: string, val: string) => ({
          eq: vi.fn((_col2: string, val2: string) => ({
            maybeSingle: vi.fn(async () => {
              const row = rows.find(r => r.artist_name === val && r.lang === val2);
              return { data: row ?? null, error: null };
            }),
          })),
        })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  };
}

describe("blurb cache", () => {
  it("returns null on miss", async () => {
    const sb = fakeSupabase([]) as unknown as Parameters<typeof getCachedBlurb>[0];
    const blurb = await getCachedBlurb(sb, "Glass Animals", "en");
    expect(blurb).toBeNull();
  });

  it("returns the blurb on hit", async () => {
    const sb = fakeSupabase([{ artist_name: "Glass Animals", lang: "en", blurb: "Dream-pop." }]) as unknown as Parameters<typeof getCachedBlurb>[0];
    const blurb = await getCachedBlurb(sb, "Glass Animals", "en");
    expect(blurb).toBe("Dream-pop.");
  });

  it("saveBlurb upserts without throwing", async () => {
    const sb = fakeSupabase([]) as unknown as Parameters<typeof saveBlurb>[0];
    await expect(saveBlurb(sb, "Mochakk", "en", "Late, sweaty, worth it.")).resolves.toBeUndefined();
  });
});
