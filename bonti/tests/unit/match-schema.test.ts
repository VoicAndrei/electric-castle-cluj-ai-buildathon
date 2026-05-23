import { describe, it, expect } from "vitest";
import { MatchOutputSchema } from "@/lib/music-match/match-schema";

describe("MatchOutputSchema", () => {
  it("accepts a minimal valid match", () => {
    const ok = MatchOutputSchema.parse({
      intro: "Your taste leans synth + indie.",
      picks: [
        { artist: "Glass Animals", day: "Saturday", stage: "Main Stage", reason: "Tame Impala overlap is real." },
      ],
      skips: [],
    });
    expect(ok.picks[0].artist).toBe("Glass Animals");
  });

  it("rejects picks missing required fields", () => {
    expect(() =>
      MatchOutputSchema.parse({
        intro: "x",
        picks: [{ artist: "X" }],
        skips: [],
      }),
    ).toThrow();
  });

  it("clamps overly large arrays", () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      artist: `A${i}`,
      day: "Friday",
      stage: "Main Stage",
      reason: "r",
    }));
    expect(() => MatchOutputSchema.parse({ intro: "x", picks: big, skips: [] })).toThrow(); // capped at 12
  });
});
