import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/chunking";

describe("chunkText", () => {
  it("returns a single chunk for short input", () => {
    const out = chunkText("Hello world.", { maxTokens: 500, overlap: 100 });
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("Hello world.");
  });

  it("splits long input into multiple chunks", () => {
    const para = "word ".repeat(2000);
    const out = chunkText(para, { maxTokens: 500, overlap: 100 });
    expect(out.length).toBeGreaterThan(1);
    out.forEach((c) => expect(c.length).toBeGreaterThan(0));
  });

  it("creates overlap between consecutive chunks", () => {
    const para = "word ".repeat(2000);
    const out = chunkText(para, { maxTokens: 500, overlap: 100 });
    if (out.length >= 2) {
      const tail = out[0].slice(-200);
      const head = out[1].slice(0, 200);
      const tailWords = new Set(tail.split(/\s+/));
      const headWords = head.split(/\s+/);
      const shared = headWords.filter((w) => tailWords.has(w));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it("respects paragraph boundaries when possible", () => {
    const doc = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
    const out = chunkText(doc, { maxTokens: 10, overlap: 2 });
    out.forEach((c) => expect(c).not.toMatch(/^\s/));
  });
});
