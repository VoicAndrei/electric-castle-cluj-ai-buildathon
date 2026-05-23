import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect } from "vitest";
import { matchToLineup } from "@/lib/music-match/match-llm";

describe("matchToLineup (real LLM)", () => {
  it("returns picks from the EC lineup for a synthwave/indie library", async () => {
    const out = await matchToLineup({
      lang: "en",
      normalized: {
        artists: [
          { name: "Tame Impala", frequency: 4 },
          { name: "Fred again..", frequency: 3 },
          { name: "LP", frequency: 2 },
        ],
        tracks: [],
      },
    });
    expect(out.intro.length).toBeGreaterThan(8);
    expect(out.picks.length).toBeGreaterThan(0);
    for (const p of out.picks) {
      expect(["Friday", "Saturday", "Sunday"]).toContain(p.day);
      expect(typeof p.reason).toBe("string");
    }
  }, 60_000);
});
