import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockGetUser },
  }),
}));

import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    process.env.ADMIN_EMAILS = "andrei.voic@rebeldot.com,other@example.com";
  });

  it("throws 401 when no session", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 401,
      message: "no_session",
    });
  });

  it("throws 403 when email not in allowlist", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "stranger@example.com" } },
      error: null,
    });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 403,
      message: "not_admin",
    });
  });

  it("returns user when allowlisted", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "andrei.voic@rebeldot.com" } },
      error: null,
    });
    const { user } = await requireAdmin();
    expect(user.email).toBe("andrei.voic@rebeldot.com");
  });

  it("throws 403 when ADMIN_EMAILS is unset (closed by default)", async () => {
    delete process.env.ADMIN_EMAILS;
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "andrei.voic@rebeldot.com" } },
      error: null,
    });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 403,
      message: "not_admin",
    });
  });

  it("treats AdminAuthError as instanceof Error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    try {
      await requireAdmin();
    } catch (e) {
      expect(e).toBeInstanceOf(AdminAuthError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
