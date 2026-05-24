"use client";

import { useCallback } from "react";
import type { EventType, EventPayloadByType } from "@/lib/telemetry/events";

export function useEventLogger() {
  return useCallback(<T extends EventType>(
    type: T,
    payload: EventPayloadByType[T],
  ) => {
    const body = JSON.stringify({ type, payload });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/events",
          new Blob([body], { type: "application/json" }),
        );
        return;
      }
      void fetch("/api/events", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    } catch {
      // never block UX on telemetry
    }
  }, []);
}
