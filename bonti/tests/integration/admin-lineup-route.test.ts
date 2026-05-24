import { describe, expect, it, vi, beforeEach } from "vitest";

let adminThrow: "no_session" | "not_admin" | null = null;
vi.mock("@/lib/admin/require-admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/require-admin")>("@/lib/admin/require-admin");
  return {
    ...actual,
    requireAdmin: vi.fn().mockImplementation(async () => {
      if (adminThrow) throw new actual.AdminAuthError(adminThrow);
      return { user: { id: "u1", email: "a@b.c" } };
    }),
  };
});

const insertSelectSingle = vi.fn();
const selectOrderOrder = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: insertSelectSingle }) }),
      select: () => ({ order: () => ({ order: () => ({ order: selectOrderOrder }) }) }),
    }),
  }),
}));

import { GET, POST } from "@/app/api/admin/lineup/route";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/admin/lineup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/lineup", () => {
  beforeEach(() => {
    adminThrow = null;
    insertSelectSingle.mockReset();
    selectOrderOrder.mockReset();
  });

  it("GET 401 without session", async () => {
    adminThrow = "no_session";
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET 403 for non-admin", async () => {
    adminThrow = "not_admin";
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("GET returns rows on success", async () => {
    selectOrderOrder.mockResolvedValue({
      data: [{ id: "1", artist_name: "JT", day: "Friday", stage: "Main", start_at: null, end_at: null, ec_tags: [], genres: [], photo_url: null, sort_order: 10 }],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(1);
  });

  it("POST 400 on invalid body", async () => {
    const res = await POST(postReq({ artist_name: "", day: "Monday", stage: "" }));
    expect(res.status).toBe(400);
  });

  it("POST inserts and returns id", async () => {
    insertSelectSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
    const res = await POST(postReq({
      artist_name: "Test Artist",
      day: "Saturday",
      stage: "Main Stage",
      start_at: null,
      end_at: null,
      ec_tags: [],
      genres: [],
      sort_order: 0,
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "new-id" });
  });
});
