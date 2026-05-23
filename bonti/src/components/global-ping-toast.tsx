"use client";

import { useEffect, useRef, useState } from "react";
import { useFestivalStore, type StoredPing } from "@/lib/festival/store";
import { PingToast } from "@/components/ping-toast";

export function GlobalPingToast() {
  const pings = useFestivalStore(s => s.pings);
  const [active, setActive] = useState<StoredPing | null>(null);
  const seen = useRef<Set<string>>(new Set(pings.map(p => p.id)));

  useEffect(() => {
    // When a new ping id appears that we haven't seen, toast it.
    for (const p of pings) {
      if (!seen.current.has(p.id)) {
        seen.current.add(p.id);
        setActive(p);
        return;
      }
    }
  }, [pings]);

  return <PingToast ping={active} onDismiss={() => setActive(null)} />;
}
