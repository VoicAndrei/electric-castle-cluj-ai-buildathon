import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const orderMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

import { loadLineup } from "@/data/lineup";

describe("loadLineup", () => {
  beforeEach(() => {
    selectMock.mockReset();
    orderMock.mockReset();
    fromMock.mockReset();
  });

  it("returns DB rows when available", async () => {
    const rows = [
      { id: "1", artist_name: "JT", day: "Friday", stage: "Main", start_at: null, end_at: null, ec_tags: [], genres: [], photo_url: null, sort_order: 10 },
    ];
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    });
    const out = await loadLineup();
    expect(out).toHaveLength(1);
    expect(out[0].artist_name).toBe("JT");
  });

  it("falls back to static JSON when DB returns empty array", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    });
    const out = await loadLineup();
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id.startsWith("static-")).toBe(true);
  });

  it("falls back when DB errors", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "down" } }),
          }),
        }),
      }),
    });
    const out = await loadLineup();
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id.startsWith("static-")).toBe(true);
  });
});
