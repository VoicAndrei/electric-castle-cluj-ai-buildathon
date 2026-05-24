"use client";

import { useState } from "react";
import { useFestivalStore, type StoredPing } from "@/lib/festival/store";
import { PingToast } from "@/components/ping-toast";

export function GlobalPingToast() {
  const pings = useFestivalStore(s => s.pings);
  const silentPingIds = useFestivalStore(s => s.silentPingIds);
  const [active, setActive] = useState<StoredPing | null>(null);
  // Seed seen with current ping ids + silent ids so neither toasts on first render.
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set([...pings.map(p => p.id), ...silentPingIds]),
  );

  // Find the newest ping that hasn't been seen and isn't silent.
  // pings has newest first (appendPing prepends), so .find returns the newest match.
  const candidate = pings.find(
    p => !seenIds.has(p.id) && !silentPingIds.includes(p.id),
  );

  if (candidate) {
    const next = new Set(seenIds);
    next.add(candidate.id);
    setSeenIds(next);
    setActive(candidate);
  }

  return <PingToast ping={active} onDismiss={() => setActive(null)} />;
}
