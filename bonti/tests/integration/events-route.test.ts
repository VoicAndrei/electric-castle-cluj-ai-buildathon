import { describe, expect, it, vi, beforeEach } from "vitest";

const { logEventMock, sessionIdMock } = vi.hoisted(() => ({
  logEventMock: vi.fn().mockResolvedValue(undefined),
  sessionIdMock: vi.fn().mockResolvedValue("sess-test"),
}));

vi.mock("@/lib/telemetry/log-event", () => ({ logEvent: logEventMock }));

vi.mock("@/lib/telemetry/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/telemetry/session")>("@/lib/telemetry/session");
  return { ...actual, getOrCreateSessionId: sessionIdMock };
});

import { POST } from "@/app/api/events/route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  beforeEach(() => {
    logEventMock.mockClear();
    sessionIdMock.mockClear();
  });

  it("400s on missing type", async () => {
    const res = await POST(makeReq({ payload: {} }));
    expect(res.status).toBe(400);
  });

  it("400s on unknown event type", async () => {
    const res = await POST(makeReq({ type: "bogus", payload: {} }));
    expect(res.status).toBe(400);
  });

  it("400s on payload that fails per-type schema", async () => {
    const res = await POST(makeReq({ type: "ping_shown", payload: { ping_id: "x" } }));
    expect(res.status).toBe(400);
  });

  it("queues logEvent with session id and returns ok", async () => {
    const res = await POST(makeReq({
      type: "ping_shown",
      payload: { ping_id: "p1", urgent: true },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(logEventMock).toHaveBeenCalledWith("ping_shown", { ping_id: "p1", urgent: true }, "sess-test");
  });
});
