import { describe, expect, it } from "vitest";
import { LineupEntryInput, LineupEntryPatch } from "@/lib/admin/lineup-schema";

const validRow = {
  artist_name: "Justin Timberlake",
  day: "Friday" as const,
  stage: "Main Stage",
  start_at: "2026-07-17T19:00:00Z",
  end_at: "2026-07-17T20:30:00Z",
  ec_tags: ["headliner", "pop"],
  genres: ["pop", "rnb"],
  photo_url: "https://example.com/jt.jpg",
  sort_order: 10,
};

describe("LineupEntryInput", () => {
  it("accepts a complete valid row", () => {
    expect(() => LineupEntryInput.parse(validRow)).not.toThrow();
  });

  it("accepts null start_at / end_at (TBA)", () => {
    const tba = { ...validRow, start_at: null, end_at: null };
    const parsed = LineupEntryInput.parse(tba);
    expect(parsed.start_at).toBeNull();
    expect(parsed.end_at).toBeNull();
  });

  it("transforms empty-string start_at to null", () => {
    const parsed = LineupEntryInput.parse({ ...validRow, start_at: "", end_at: "" });
    expect(parsed.start_at).toBeNull();
    expect(parsed.end_at).toBeNull();
  });

  it("rejects end_at before start_at", () => {
    expect(() => LineupEntryInput.parse({
      ...validRow,
      start_at: "2026-07-17T20:00:00Z",
      end_at: "2026-07-17T19:00:00Z",
    })).toThrow(/end_at/);
  });

  it("rejects invalid day", () => {
    expect(() => LineupEntryInput.parse({ ...validRow, day: "Monday" })).toThrow();
  });

  it("rejects javascript: photo_url scheme", () => {
    expect(() => LineupEntryInput.parse({ ...validRow, photo_url: "javascript:alert(1)" })).toThrow();
  });

  it("defaults ec_tags and genres to []", () => {
    const { ec_tags, ...without } = validRow;
    void ec_tags;
    const parsed = LineupEntryInput.parse({ ...without, ec_tags: undefined, genres: undefined });
    expect(parsed.ec_tags).toEqual([]);
    expect(parsed.genres).toEqual([]);
  });
});

describe("LineupEntryPatch", () => {
  it("accepts partial input", () => {
    expect(() => LineupEntryPatch.parse({ stage: "Hangar Stage" })).not.toThrow();
  });

  it("still validates end > start when both present", () => {
    expect(() => LineupEntryPatch.parse({
      start_at: "2026-07-17T20:00:00Z",
      end_at: "2026-07-17T19:00:00Z",
    })).toThrow();
  });
});
