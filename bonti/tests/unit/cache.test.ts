import { describe, it, expect } from "vitest";
import { hashUrl } from "@/lib/music-match/cache";

describe("hashUrl", () => {
  it("is deterministic", () => {
    expect(hashUrl("x")).toBe(hashUrl("x"));
  });

  it("normalizes whitespace and trailing slashes", () => {
    expect(hashUrl("  https://example.com/x  ")).toBe(hashUrl("https://example.com/x/"));
  });

  it("differs across inputs", () => {
    expect(hashUrl("a")).not.toBe(hashUrl("b"));
  });

  it("returns a 64-char hex string", () => {
    expect(hashUrl("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
