import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
  AdminAuthError: class extends Error {
    status: number;
    constructor(message: string) {
      super(message);
      this.status = message === "no_session" ? 401 : 403;
    }
  },
}));

import { POST } from "@/app/api/admin/broadcast/draft/route";

describe("/api/admin/broadcast/draft", () => {
  beforeEach(() => { mockRequireAdmin.mockReset(); });

  it("returns 401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "JT starts in 5", urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not allowlisted", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("not_admin"));
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "JT starts in 5", urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 on missing source_text", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns a bilingual draft when authorized + valid (live LLM)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source_text: "Justin Timberlake starts in 5 min, head to Main",
        target_venue_id: "main_stage",
        urgency: "standard",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.title_en).toBe("string");
    expect(typeof body.body_en).toBe("string");
    expect(typeof body.title_ro).toBe("string");
    expect(typeof body.body_ro).toBe("string");
    expect(body.body_ro.length).toBeGreaterThan(0);
  }, 60_000);
});
