import { describe, it, expect } from "vitest";
import { DraftResultSchema, extractDraftJson } from "@/lib/admin/draft-schema";

describe("draft schema", () => {
  it("accepts a valid bilingual draft", () => {
    const text = `{
      "title_en": "JT in 5",
      "body_en": "Justin Timberlake starts in 5 minutes at Main.",
      "title_ro": "JT in 5",
      "body_ro": "Justin Timberlake începe în 5 minute la Main."
    }`;
    const out = extractDraftJson(text);
    expect(out.title_en).toBe("JT in 5");
    expect(out.body_ro).toContain("Main");
  });

  it("strips markdown fences before parsing", () => {
    const text = "```json\n{\"title_en\":\"a\",\"body_en\":\"b\",\"title_ro\":\"c\",\"body_ro\":\"d\"}\n```";
    expect(() => extractDraftJson(text)).not.toThrow();
  });

  it("rejects when title exceeds 60 chars", () => {
    const longTitle = "x".repeat(61);
    expect(() =>
      DraftResultSchema.parse({
        title_en: longTitle, body_en: "ok",
        title_ro: "ok", body_ro: "ok",
      }),
    ).toThrow();
  });

  it("rejects when body exceeds 280 chars", () => {
    const longBody = "x".repeat(281);
    expect(() =>
      DraftResultSchema.parse({
        title_en: "ok", body_en: longBody,
        title_ro: "ok", body_ro: "ok",
      }),
    ).toThrow();
  });

  it("throws on completely non-JSON text", () => {
    expect(() => extractDraftJson("not json at all"))
      .toThrow(/No JSON object found/);
  });
});
