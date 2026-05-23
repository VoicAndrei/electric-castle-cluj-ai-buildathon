import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect } from "vitest";
import { embed } from "@/lib/embeddings";

describe("embed (Cohere)", () => {
  it("returns a 1024-dim vector for a short string", async () => {
    const v = await embed("Electric Castle is a festival in Romania.");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(1024);
  });

  it("returns deterministic vectors for identical inputs", async () => {
    const a = await embed("test sentence");
    const b = await embed("test sentence");
    const diff = a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
    expect(diff).toBeLessThan(0.001);
  });

  it("returns dissimilar vectors for unrelated inputs", async () => {
    const a = await embed("Bonțida is a village in Cluj.");
    const b = await embed("Pizza is round.");
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const cosine = dot / (Math.sqrt(magA) * Math.sqrt(magB));
    expect(cosine).toBeLessThan(0.95);
  });
});
