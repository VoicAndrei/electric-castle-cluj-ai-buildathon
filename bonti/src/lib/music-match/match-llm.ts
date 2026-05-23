import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { MatchOutputSchema, type MatchOutput } from "./match-schema";
import { buildMatchPrompt } from "./match-prompt";
import type { NormalizedPlaylist } from "./spotify";
import type { Lang } from "@/types/chat";

const JSON_INSTRUCTION = `
Respond with ONLY a JSON object — no markdown fences, no prose before or after.
The object must have exactly these fields:
{
  "intro": "<string, 1 sentence, <= 200 chars>",
  "picks": [{ "artist": "<string>", "day": "<Friday|Saturday|Sunday>", "stage": "<string>", "reason": "<string, <= 200 chars>" }],
  "skips": [{ "artist": "<string>", "reason": "<string, <= 160 chars>" }]
}
picks: 3-8 items. skips: 0-3 items.
`.trim();

function extractJson(text: string): MatchOutput {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  // Find outermost JSON object
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in LLM response");
  const jsonStr = stripped.slice(start, end + 1);
  const raw = JSON.parse(jsonStr);
  return MatchOutputSchema.parse(raw);
}

export async function matchToLineup(input: {
  lang: Lang;
  normalized: NormalizedPlaylist;
}): Promise<MatchOutput> {
  const basePrompt = buildMatchPrompt(input);
  const prompt = `${basePrompt}\n\n${JSON_INSTRUCTION}`;

  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxRetries: 0,
        abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error("Empty response");
      return extractJson(text);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[match-llm] ${label} failed:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error("All match-LLM candidates failed");
}
