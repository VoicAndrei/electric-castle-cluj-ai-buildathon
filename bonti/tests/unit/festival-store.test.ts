import { describe, it, expect, beforeEach } from "vitest";
import { createFestivalStore, type FestivalStoreApi } from "@/lib/festival/store";
import { MARIA, FRIENDS, SEEDED_PINGS, LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

describe("festival store", () => {
  let store: FestivalStoreApi;

  beforeEach(() => {
    store = createFestivalStore();
  });

  it("seeds from festival-state defaults", () => {
    const s = store.getState();
    expect(s.maria.id).toBe(MARIA.id);
    expect(s.friends).toHaveLength(FRIENDS.length);
    expect(s.pings).toHaveLength(SEEDED_PINGS.length);
    expect(s.pings.every(p => p.read === false)).toBe(true);
  });

  it("appendPing adds with received_at and read=false", () => {
    const before = store.getState().pings.length;
    store.getState().appendPing({ ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() });
    const after = store.getState().pings;
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(LIVE_GLASS_ANIMALS_PING.id);
    expect(after[0].read).toBe(false);
    expect(after[0].received_at).toBeDefined();
  });

  it("markAllPingsRead flips every read flag", () => {
    store.getState().markAllPingsRead();
    expect(store.getState().pings.every(p => p.read === true)).toBe(true);
  });

  it("applyGroupConverge updates positions and stores meeting", () => {
    store.getState().applyGroupConverge({
      meeting_point_id: "banffy_stage",
      eta_min: 8,
      reason: "Banffy puts everyone within 5 min walk.",
      target_coords: { x: 500, y: 200 },
    });
    const s = store.getState();
    expect(s.group_meeting?.point_id).toBe("banffy_stage");
    expect(s.group_meeting?.eta_min).toBe(8);
    for (const f of s.friends) {
      expect(f.coords).toEqual({ x: 500, y: 200 });
    }
    expect(s.maria.coords).toEqual({ x: 500, y: 200 });
  });

  it("reset returns to seeded defaults", () => {
    store.getState().markAllPingsRead();
    store.getState().reset();
    expect(store.getState().pings.every(p => p.read === false)).toBe(true);
  });
});
