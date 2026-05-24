"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { FestivalHero } from "@/components/festival-hero";
import { AppTileGrid } from "@/components/app-tile-grid";
import { LiveTicker } from "@/components/live-ticker";
import { useFestivalStore } from "@/lib/festival/store";
import { LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

// Chat lives in the floating duck FAB on every /app surface (see
// BontiChatFAB) — keeping it as a one-tap bottom-sheet means the user
// never has to scroll past the tile grid to reach it, and the same
// affordance works identically on every /app route.
export default function AppHome() {
  const appendPing = useFestivalStore(s => s.appendPing);
  const unread = useFestivalStore(s => s.pings.filter(p => !p.read).length);

  useEffect(() => {
    // Live moment: 8s after mount, fire the Glass Animals 10-min warning.
    // Idempotent — if already in the feed (e.g. user came back), no-op.
    const t = setTimeout(() => {
      const store = useFestivalStore.getState();
      if (store.pings.some(p => p.id === LIVE_GLASS_ANIMALS_PING.id)) return;
      appendPing({
        ...LIVE_GLASS_ANIMALS_PING,
        fires_at: new Date(DEMO_NOW.getTime() + 8_000).toISOString(),
      });
    }, 8_000);
    return () => clearTimeout(t);
  }, [appendPing]);

  return (
    <>
      <AppHeader title="Bonți" unread={unread} />
      <FestivalHero />
      <LiveTicker />
      <AppTileGrid />
    </>
  );
}
