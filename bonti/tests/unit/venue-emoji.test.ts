import { describe, expect, it } from "vitest";
import { VENUE } from "@/data/venue";
import { emojiForKind, KIND_EMOJI } from "@/lib/festival/venue-emoji";

describe("venue-emoji", () => {
  it("has an emoji for every VenueKind present in the venue list", () => {
    for (const v of VENUE) {
      expect(KIND_EMOJI[v.kind], `missing emoji for kind=${v.kind}`).toBeTruthy();
    }
  });

  it("emojiForKind returns the mapped emoji", () => {
    expect(emojiForKind("beer")).toBe("🍺");
    expect(emojiForKind("food")).toBe("🍕");
    expect(emojiForKind("bathroom")).toBe("🚻");
    expect(emojiForKind("stage")).toBe("🎤");
  });
});
