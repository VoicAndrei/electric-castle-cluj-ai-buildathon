"use client";

import { useBroadcastsRealtime } from "@/hooks/use-broadcasts-realtime";

export function BroadcastsRealtimeMount({ lang }: { lang: "en" | "ro" }) {
  useBroadcastsRealtime({ lang });
  return null;
}
