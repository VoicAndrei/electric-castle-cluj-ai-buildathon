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

const mockInsert = vi.fn();
const mockSelectArg = vi.fn();
const mockOrder = vi.fn();
const mockGte = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        mockInsert(row);
        return {
          select: () => ({
            single: () => mockSingle(),
          }),
        };
      },
      select: (cols: string) => {
        mockSelectArg(cols);
        return {
          gte: (col: string, val: string) => {
            mockGte(col, val);
            return {
              order: (col2: string, opts: unknown) => {
                mockOrder(col2, opts);
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
    }),
  }),
}));

import { POST, GET } from "@/app/api/admin/broadcasts/route";

describe("/api/admin/broadcasts POST", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockInsert.mockReset();
    mockSingle.mockReset();
  });

  it("401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("400 on invalid body", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "x" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("200 on valid body and returns inserted id", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    mockSingle.mockResolvedValueOnce({
      data: { id: "33333333-3333-3333-3333-333333333333" },
      error: null,
    });
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source_text: "JT starts in 5",
        title_en: "JT in 5",
        body_en: "Justin Timberlake starts in 5 min at Main.",
        title_ro: "JT în 5",
        body_ro: "Justin Timberlake începe în 5 min la Main.",
        urgency: "standard",
        target_venue_id: "main_stage",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("33333333-3333-3333-3333-333333333333");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_text: "JT starts in 5",
        final_en: "Justin Timberlake starts in 5 min at Main.",
        final_ro: "Justin Timberlake începe în 5 min la Main.",
        sent_by: "u1",
        target_venue_id: "main_stage",
      }),
    );
  });
});

describe("/api/admin/broadcasts GET", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockSelectArg.mockReset();
    mockGte.mockReset();
    mockOrder.mockReset();
  });

  it("401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("200 returns broadcasts array (last 24h, sorted desc)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.broadcasts)).toBe(true);
    expect(mockOrder).toHaveBeenCalledWith("sent_at", { ascending: false });
  });
});
