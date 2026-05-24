import { describe, it, expect } from "vitest";
import { broadcastToPing, type BroadcastRow } from "@/lib/festival/broadcast-to-ping";

const baseRow: BroadcastRow = {
  id: "11111111-1111-1111-1111-111111111111",
  final_en: "Justin Timberlake starts in 5 min at Main.",
  final_ro: "Justin Timberlake începe în 5 min la Main.",
  title_en: "JT in 5",
  title_ro: "JT în 5",
  deeplink: null,
  target_venue_id: null,
  urgency: "standard",
  sent_at: "2026-07-18T22:10:00+03:00",
};

describe("broadcastToPing", () => {
  it("maps RO with title + body", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.id).toBe("broadcast-11111111-1111-1111-1111-111111111111");
    expect(p.title).toBe("JT în 5");
    expect(p.body).toBe("Justin Timberlake începe în 5 min la Main.");
    expect(p.lang).toBe("ro");
    expect(p.fires_at).toBe(baseRow.sent_at);
  });

  it("maps EN with title + body", () => {
    const p = broadcastToPing(baseRow, "en");
    expect(p.title).toBe("JT in 5");
    expect(p.body).toBe("Justin Timberlake starts in 5 min at Main.");
  });

  it("falls back to '⚡ Live update' when title is empty", () => {
    const p = broadcastToPing({ ...baseRow, title_en: "", title_ro: "" }, "ro");
    expect(p.title).toBe("⚡ Live update");
  });

  it("derives deeplink from target_venue_id", () => {
    const p = broadcastToPing({ ...baseRow, target_venue_id: "main_stage" }, "ro");
    expect(p.deeplink).toBe("/app/compass?target=main_stage");
  });

  it("prefers explicit deeplink over target_venue_id", () => {
    const p = broadcastToPing(
      { ...baseRow, deeplink: "/app/group", target_venue_id: "main_stage" },
      "ro",
    );
    expect(p.deeplink).toBe("/app/group");
  });

  it("falls back to /app/notifications when neither field is set", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.deeplink).toBe("/app/notifications");
  });

  it("sets urgent flag when urgency is critical", () => {
    const p = broadcastToPing({ ...baseRow, urgency: "critical" }, "ro");
    expect(p.urgent).toBe(true);
  });

  it("does NOT set urgent flag for standard urgency", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.urgent).toBeUndefined();
  });
});
