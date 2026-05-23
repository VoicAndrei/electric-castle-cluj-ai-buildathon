import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildCompassPrompt } from "@/lib/festival/prompts";
import { extractCompassJson } from "@/lib/festival/compass-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { query?: string; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const query = body.query?.trim();
  if (!query) return new Response("Missing query", { status: 400 });
  const lang = body.lang ?? "en";

  const prompt = buildCompassPrompt({ query, lang });

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
        model, prompt, temperature: 0.4, maxRetries: 0, abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error(`Empty from ${label}`);
      const result = extractCompassJson(text);
      return Response.json(result);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[compass] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Compass unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
