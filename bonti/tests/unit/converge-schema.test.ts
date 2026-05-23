import { describe, it, expect } from "vitest";
import { ConvergeResultSchema, extractConvergeJson } from "@/lib/festival/converge-schema";

describe("converge schema", () => {
  it("accepts a valid LLM response", () => {
    const text = `{"meeting_point_id":"banffy_stage","eta_min":8,"reason":"Banffy puts everyone within 5 min walk.","en":"Banffy. 8 min.","ro":"La Banffy. 8 min."}`;
    const out = extractConvergeJson(text);
    expect(out.meeting_point_id).toBe("banffy_stage");
    expect(out.eta_min).toBe(8);
  });

  it("rejects eta_min out of range", () => {
    expect(() =>
      ConvergeResultSchema.parse({
        meeting_point_id: "x", eta_min: 99, reason: "a", en: "a", ro: "a",
      }),
    ).toThrow();
  });
});
