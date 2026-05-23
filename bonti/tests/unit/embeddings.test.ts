import { describe, it, expect } from "vitest";
import { embed } from "@/lib/embeddings";

describe("embed", () => {
  it("returns a 1024-dim vector for a short string", async () => {
    const v = await embed("Electric Castle is a festival in Romania.");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(1024);
  });

  it("returns identical vectors for identical inputs", async () => {
    const a = await embed("test sentence");
    const b = await embed("test sentence");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("returns different vectors for different inputs", async () => {
    const a = await embed("Bonțida is a village in Cluj.");
    const b = await embed("Pizza is round.");
    // Cosine similarity should be < 0.95
    const dot = a.reduce((s, x, i) => s + x * b[i], 0);
    const magA = Math.hypot(...a);
    const magB = Math.hypot(...b);
    const cosine = dot / (magA * magB);
    expect(cosine).toBeLessThan(0.95);
  });
});
