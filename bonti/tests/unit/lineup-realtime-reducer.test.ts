import { describe, expect, it } from "vitest";
import { applyChange, byDayThenSort, type LineupRow } from "@/hooks/use-lineup-realtime";

const row = (over: Partial<LineupRow> = {}): LineupRow => ({
  id: "id1",
  artist_name: "A",
  day: "Friday",
  stage: "Main",
  start_at: null,
  end_at: null,
  ec_tags: [],
  genres: [],
  photo_url: null,
  sort_order: 10,
  ...over,
});

describe("applyChange", () => {
  it("INSERT appends and re-sorts", () => {
    const prev = [row({ id: "1", artist_name: "Z", day: "Friday", sort_order: 20 })];
    const next = applyChange(prev, {
      eventType: "INSERT",
      new: row({ id: "2", artist_name: "A", day: "Friday", sort_order: 10 }),
      old: { id: "" },
    });
    expect(next.map(r => r.id)).toEqual(["2", "1"]);
  });

  it("UPDATE replaces by id and re-sorts", () => {
    const prev = [
      row({ id: "1", artist_name: "A", day: "Friday", sort_order: 10 }),
      row({ id: "2", artist_name: "B", day: "Friday", sort_order: 20 }),
    ];
    const next = applyChange(prev, {
      eventType: "UPDATE",
      new: row({ id: "1", artist_name: "A", day: "Friday", sort_order: 30 }),
      old: { id: "1" },
    });
    expect(next.map(r => r.id)).toEqual(["2", "1"]);
  });

  it("DELETE removes by id", () => {
    const prev = [row({ id: "1" }), row({ id: "2" })];
    const next = applyChange(prev, { eventType: "DELETE", new: row(), old: { id: "1" } });
    expect(next.map(r => r.id)).toEqual(["2"]);
  });

  it("unknown eventType is a no-op", () => {
    const prev = [row({ id: "1" })];
    expect(applyChange(prev, { eventType: "OTHER", new: row(), old: { id: "x" } })).toBe(prev);
  });
});

describe("byDayThenSort", () => {
  it("orders Friday < Saturday < Sunday", () => {
    const items = [
      row({ day: "Sunday", sort_order: 10 }),
      row({ day: "Friday", sort_order: 20 }),
      row({ day: "Saturday", sort_order: 5 }),
    ];
    const sorted = [...items].sort(byDayThenSort);
    expect(sorted.map(r => r.day)).toEqual(["Friday", "Saturday", "Sunday"]);
  });

  it("breaks ties by sort_order then artist_name", () => {
    const items = [
      row({ day: "Friday", sort_order: 10, artist_name: "B" }),
      row({ day: "Friday", sort_order: 10, artist_name: "A" }),
      row({ day: "Friday", sort_order: 5, artist_name: "Z" }),
    ];
    const sorted = [...items].sort(byDayThenSort);
    expect(sorted.map(r => r.artist_name)).toEqual(["Z", "A", "B"]);
  });
});
