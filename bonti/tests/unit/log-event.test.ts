import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { logEvent } from "@/lib/telemetry/log-event";

describe("logEvent", () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    fromMock.mockClear();
  });

  it("inserts a row with type, payload, session_id", async () => {
    await logEvent("compass_query", { query_len: 8, target_venue_id: "main", latency_ms: 400 }, "sess-1");
    expect(fromMock).toHaveBeenCalledWith("events");
    expect(insertMock).toHaveBeenCalledWith({
      type: "compass_query",
      payload: { query_len: 8, target_venue_id: "main", latency_ms: 400 },
      session_id: "sess-1",
    });
  });

  it("nulls session_id when not provided", async () => {
    await logEvent("lineup_view", { day: "Friday", language: "en", has_match: true });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ session_id: null }));
  });

  it("never throws when insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "DB down" } });
    await expect(logEvent("lineup_view", { day: "Friday", language: "en", has_match: false })).resolves.toBeUndefined();
  });

  it("never throws when the client throws", async () => {
    insertMock.mockRejectedValue(new Error("network"));
    await expect(logEvent("ping_shown", { ping_id: "x", urgent: false })).resolves.toBeUndefined();
  });
});
