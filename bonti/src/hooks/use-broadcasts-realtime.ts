"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFestivalStore } from "@/lib/festival/store";
import { broadcastToPing, type BroadcastRow } from "@/lib/festival/broadcast-to-ping";

export function useBroadcastsRealtime({ lang }: { lang: "en" | "ro" }): void {
  useEffect(() => {
    const supabase = createClient();
    const appendPing = useFestivalStore.getState().appendPing;
    let cancelled = false;

    // 1) Hydrate from last 12h.
    (async () => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("broadcasts")
        .select("id, final_en, final_ro, title_en, title_ro, deeplink, target_venue_id, urgency, sent_at")
        .gte("sent_at", since)
        .order("sent_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn("[broadcasts] hydrate failed:", error.message);
        return;
      }
      for (const row of (data ?? []) as BroadcastRow[]) {
        appendPing(broadcastToPing(row, lang), { silent: true });
      }
    })();

    // 2) Subscribe to live INSERTs.
    const channel = supabase
      .channel("bonti-broadcasts")
      .on(
        "postgres_changes" as never,
        { event: "INSERT", schema: "public", table: "broadcasts" } as never,
        (payload: { new: BroadcastRow }) => {
          appendPing(broadcastToPing(payload.new, lang));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [lang]);
}
