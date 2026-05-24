import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (name: string) => {
        const v = store.get(name);
        return v ? { name, value: v } : undefined;
      },
      set: (name: string, value: string) => {
        store.set(name, value);
      },
    }),
  };
});

import { getOrCreateSessionId, SESSION_COOKIE_NAME } from "@/lib/telemetry/session";

describe("session cookie", () => {
  it("exports the expected cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("bonti-session-id");
  });

  it("creates and persists a uuid on first call", async () => {
    const id = await getOrCreateSessionId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the same id on subsequent calls", async () => {
    const a = await getOrCreateSessionId();
    const b = await getOrCreateSessionId();
    expect(a).toBe(b);
  });
});
