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
const updateEqSelectSingle = vi.fn();
const deleteEq = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: insertSelectSingle }) }),
      select: () => ({ order: () => ({ order: () => ({ order: selectOrderOrder }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: updateEqSelectSingle }) }) }),
      delete: () => ({ eq: deleteEq }),
    }),
  }),
}));

import { GET, POST } from "@/app/api/admin/lineup/route";
import { PATCH, DELETE } from "@/app/api/admin/lineup/[id]/route";

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

function patchReq(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/lineup/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq(id: string): Request {
  return new Request(`http://localhost/api/admin/lineup/${id}`, { method: "DELETE" });
}

describe("/api/admin/lineup/[id]", () => {
  beforeEach(() => {
    adminThrow = null;
    updateEqSelectSingle.mockReset();
    deleteEq.mockReset();
  });

  it("PATCH 401 without session", async () => {
    adminThrow = "no_session";
    const res = await PATCH(patchReq("1", { stage: "Hangar" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("PATCH 400 on invalid body", async () => {
    const res = await PATCH(patchReq("1", { day: "Funday" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH updates and returns id on success", async () => {
    updateEqSelectSingle.mockResolvedValue({ data: { id: "1" }, error: null });
    const res = await PATCH(patchReq("1", { stage: "Hangar Stage" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "1" });
  });

  it("DELETE 401 without session", async () => {
    adminThrow = "no_session";
    const res = await DELETE(deleteReq("1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("DELETE returns 204 on success", async () => {
    deleteEq.mockResolvedValue({ error: null });
    const res = await DELETE(deleteReq("1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(204);
  });
});
