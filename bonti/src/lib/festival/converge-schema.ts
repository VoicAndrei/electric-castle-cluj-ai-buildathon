import { z } from "zod";

export const ConvergeResultSchema = z.object({
  meeting_point_id: z.string().min(1).max(64),
  eta_min: z.number().int().min(3).max(20),
  reason: z.string().min(1).max(240),
  en: z.string().min(1).max(160),
  ro: z.string().min(1).max(160),
});

export type ConvergeResult = z.infer<typeof ConvergeResultSchema>;

export function extractConvergeJson(text: string): ConvergeResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in converge response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return ConvergeResultSchema.parse(raw);
}
