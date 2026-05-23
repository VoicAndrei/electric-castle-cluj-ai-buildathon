import { describe, it, expect } from "vitest";
import { parseFreeform } from "@/lib/music-match/freeform";

describe("parseFreeform", () => {
  it("splits comma- and newline-separated artist lists with frequency counting", () => {
    const result = parseFreeform("Glass Animals, Tame Impala\nFred again..\nLP, LP");
    expect(result.artists.map((a) => a.name)).toEqual(["LP", "Fred again..", "Glass Animals", "Tame Impala"]);
    expect(result.artists.find((a) => a.name === "LP")?.frequency).toBe(2);
    expect(result.tracks).toEqual([]);
  });

  it("ignores empty lines and whitespace", () => {
    const result = parseFreeform("\n  Glass Animals  \n\n,\n LP \n");
    expect(result.artists.map((a) => a.name)).toEqual(["Glass Animals", "LP"]);
  });

  it("returns empty arrays for blank input", () => {
    const result = parseFreeform("");
    expect(result.artists).toEqual([]);
    expect(result.tracks).toEqual([]);
  });
});
