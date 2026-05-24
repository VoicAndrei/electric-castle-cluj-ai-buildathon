import { z } from "zod";

export const DraftResultSchema = z.object({
  title_en: z.string().max(60),
  body_en: z.string().min(1).max(280),
  title_ro: z.string().max(60),
  body_ro: z.string().min(1).max(280),
});

export type DraftResult = z.infer<typeof DraftResultSchema>;

export function extractDraftJson(text: string): DraftResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in draft LLM response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return DraftResultSchema.parse(raw);
}
