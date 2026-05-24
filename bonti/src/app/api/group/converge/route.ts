import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildConvergePrompt } from "@/lib/festival/prompts";
import { extractConvergeJson } from "@/lib/festival/converge-schema";
import { logEvent } from "@/lib/telemetry/log-event";
import { readSessionIdFromCookies } from "@/lib/telemetry/session";

export const runtime = "nodejs";
export const maxDuration = 30;

type Position = { id: string; name: string; coords: { x: number; y: number } };
type Body = { positions?: Position[]; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const positions = body.positions ?? [];
  if (positions.length < 2) return new Response("Need at least 2 positions", { status: 400 });

  const prompt = buildConvergePrompt({ positions, lang: body.lang ?? "en" });

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
      const converge = extractConvergeJson(text);
      const sessionId = await readSessionIdFromCookies();
      void logEvent("group_converge", {
        venue_id: converge.meeting_point_id ?? "unknown",
        friend_count: positions.length,
      }, sessionId);
      return Response.json(converge);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[converge] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Converge unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
