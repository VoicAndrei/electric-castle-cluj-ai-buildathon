import type { SeededPing } from "@/data/festival-state";

export type BroadcastRow = {
  id: string;
  final_en: string;
  final_ro: string;
  title_en: string;
  title_ro: string;
  deeplink: string | null;
  target_venue_id: string | null;
  urgency: "standard" | "critical";
  sent_at: string;
};

export function broadcastToPing(row: BroadcastRow, lang: "en" | "ro"): SeededPing {
  const title = lang === "ro" ? row.title_ro : row.title_en;
  const body = lang === "ro" ? row.final_ro : row.final_en;
  const deeplink =
    row.deeplink ??
    (row.target_venue_id ? `/app/compass?target=${row.target_venue_id}` : "/app/notifications");
  const ping: SeededPing = {
    id: `broadcast-${row.id}`,
    fires_at: row.sent_at,
    lang,
    title: title || "⚡ Live update",
    body,
    deeplink,
  };
  if (row.urgency === "critical") ping.urgent = true;
  return ping;
}
