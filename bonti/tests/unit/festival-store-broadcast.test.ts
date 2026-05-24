import { describe, it, expect, beforeEach } from "vitest";
import { createFestivalStore, type FestivalStoreApi } from "@/lib/festival/store";
import { LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

describe("festival store — broadcast silent flag", () => {
  let store: FestivalStoreApi;
  beforeEach(() => {
    store = createFestivalStore();
  });

  it("initializes silentPingIds as empty array", () => {
    expect(store.getState().silentPingIds).toEqual([]);
  });

  it("appendPing without opts does NOT add to silentPingIds", () => {
    store.getState().appendPing({
      ...LIVE_GLASS_ANIMALS_PING,
      fires_at: DEMO_NOW.toISOString(),
    });
    expect(store.getState().silentPingIds).toEqual([]);
  });

  it("appendPing with { silent: true } adds id to silentPingIds", () => {
    const ping = { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() };
    store.getState().appendPing(ping, { silent: true });
    expect(store.getState().silentPingIds).toContain(ping.id);
    expect(store.getState().pings[0].id).toBe(ping.id);
  });

  it("appendPing dedupes silentPingIds — calling twice does not duplicate", () => {
    const ping = { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() };
    store.getState().appendPing(ping, { silent: true });
    store.getState().appendPing(ping, { silent: true });
    expect(store.getState().silentPingIds.filter(id => id === ping.id)).toHaveLength(1);
  });

  it("reset clears silentPingIds", () => {
    store.getState().appendPing(
      { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() },
      { silent: true },
    );
    store.getState().reset();
    expect(store.getState().silentPingIds).toEqual([]);
  });
});
