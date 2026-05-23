import { describe, it, expect } from "vitest";
import { CompassResultSchema, extractCompassJson } from "@/lib/festival/compass-schema";

describe("compass schema", () => {
  it("accepts a valid LLM response", () => {
    const text = '```json\n{"target_id":"beer_garden_n","reason":"Closest beer","line_state":"Line is short"}\n```';
    const out = extractCompassJson(text);
    expect(out.target_id).toBe("beer_garden_n");
    expect(out.line_state).toBe("Line is short");
  });

  it("rejects missing fields", () => {
    expect(() => CompassResultSchema.parse({ target_id: "x" })).toThrow();
  });
});
