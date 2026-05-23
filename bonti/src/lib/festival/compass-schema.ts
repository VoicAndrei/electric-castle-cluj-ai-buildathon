import { z } from "zod";

export const CompassResultSchema = z.object({
  target_id: z.string().min(1).max(64),
  reason: z.string().min(1).max(240),
  line_state: z.string().min(1).max(80),
});

export type CompassResult = z.infer<typeof CompassResultSchema>;

export function extractCompassJson(text: string): CompassResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in compass response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return CompassResultSchema.parse(raw);
}
