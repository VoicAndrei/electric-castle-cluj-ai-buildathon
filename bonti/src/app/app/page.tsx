"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { FestivalHero } from "@/components/festival-hero";
import { AppTileGrid } from "@/components/app-tile-grid";
import { LiveTicker } from "@/components/live-ticker";
import { ChatShell } from "@/components/chat-shell";
import { useFestivalStore } from "@/lib/festival/store";
import { useOnSiteMode } from "@/lib/festival/use-on-site-mode";
import { LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

// /app is the single landing for Bonți. Its contents flip on the on-site
// signal:
// - Off-site (planning): chat-first. The same ChatShell that used to live
//   at / now lives here in pre_ticket mode, with a clear "I'm at the
//   festival" CTA to switch into on-site mode.
// - On-site: the festival surface (FestivalHero + LiveTicker + tile grid).
//   The Bonți chat is one tap away via the floating duck FAB (rendered by
//   AppLayout, gated on on-site).
//
// Demo live moment (Glass Animals 10-min warning) only fires on-site so a
// planning user doesn't see "starts in 10 min" pings.
export default function AppHome() {
  const { onSite, setOnSite } = useOnSiteMode();
  const appendPing = useFestivalStore(s => s.appendPing);
  const unread = useFestivalStore(s => s.pings.filter(p => !p.read).length);

  useEffect(() => {
    if (onSite !== true) return;
    const t = setTimeout(() => {
      const store = useFestivalStore.getState();
      if (store.pings.some(p => p.id === LIVE_GLASS_ANIMALS_PING.id)) return;
      appendPing({
        ...LIVE_GLASS_ANIMALS_PING,
        fires_at: new Date(DEMO_NOW.getTime() + 8_000).toISOString(),
      });
    }, 8_000);
    return () => clearTimeout(t);
  }, [appendPing, onSite]);

  // Hold render until the mode hydrates — prevents a chat→tiles or
  // tiles→chat flash when the page first mounts. The bare header is a
  // visible placeholder so the screen isn't pure white.
  if (onSite === null) {
    return <AppHeader title="Bonți" />;
  }

  if (!onSite) {
    return (
      <>
        <AppHeader title="Bonți" />
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => setOnSite(true)}
            className="w-full rounded-md bg-bonti-red text-white font-sofia uppercase tracking-wide text-xs py-2"
          >
            I&apos;m at the festival
          </button>
          <p className="text-bonti-text/60 text-[11px] font-roboto mt-1 mb-1">
            Switches Bonți to on-site mode — pings, live picks, venue navigation.
          </p>
        </div>
        <ChatShell mode="pre_ticket" layout="inline" />
      </>
    );
  }

  return (
    <>
      <AppHeader title="Bonți" unread={unread} />
      <FestivalHero />
      <LiveTicker />
      <AppTileGrid />
      <div className="px-4 pt-2 pb-1 flex justify-end">
        <button
          type="button"
          onClick={() => setOnSite(false)}
          className="text-bonti-text/50 text-[11px] font-roboto underline"
        >
          ← planning mode
        </button>
      </div>
    </>
  );
}
