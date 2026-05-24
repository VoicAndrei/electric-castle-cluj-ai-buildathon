import { createAdminClient } from "@/lib/supabase/admin";
import type { EventType, EventPayloadByType } from "./events";

export async function logEvent<T extends EventType>(
  type: T,
  payload: EventPayloadByType[T],
  sessionId?: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("events").insert({
      type,
      payload,
      session_id: sessionId ?? null,
    });
    if (error) {
      console.error("[telemetry] insert error:", type, error.message);
    }
  } catch (e) {
    console.error("[telemetry] log failed:", type, (e as Error).message);
  }
}
