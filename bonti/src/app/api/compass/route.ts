import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildCompassPrompt } from "@/lib/festival/prompts";
import { extractCompassJson } from "@/lib/festival/compass-schema";
import { findArtistInQuery, venueIdForStage, findVenueById } from "@/lib/festival/compass";
import { formatLocalRange } from "@/lib/festival/time";
import { logEvent } from "@/lib/telemetry/log-event";
import { readSessionIdFromCookies } from "@/lib/telemetry/session";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { query?: string; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const query = body.query?.trim();
  if (!query) return new Response("Missing query", { status: 400 });
  const lang = body.lang ?? "en";
  const startedAt = Date.now();

  // Artist lookup short-circuits the LLM: if the query mentions an artist
  // from the lineup, resolve straight to their stage's venue + set time so
  // the compass directions are grounded in actual schedule data instead of
  // an LLM guess. The route map UI is happy with the same {target_id,
  // reason, line_state} shape.
  const artistMatch = findArtistInQuery(query);
  if (artistMatch) {
    const venueId = venueIdForStage(artistMatch.stage);
    const venue = venueId ? findVenueById(venueId) : undefined;
    if (venue) {
      const timeRange = formatLocalRange(artistMatch.start_at, artistMatch.end_at);
      const reason = lang === "ro"
        ? `${artistMatch.artist} cântă pe ${artistMatch.stage}, ${artistMatch.day} ${timeRange}.`
        : `${artistMatch.artist} is on the ${artistMatch.stage}, ${artistMatch.day} ${timeRange}.`;
      const lineState = lang === "ro" ? "Vezi orarul" : "See schedule";
      const sessionId = await readSessionIdFromCookies();
      void logEvent("compass_query", {
        query_len: query.length,
        target_venue_id: venue.id,
        latency_ms: Date.now() - startedAt,
      }, sessionId);
      return Response.json({ target_id: venue.id, reason, line_state: lineState });
    }
  }

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
      const sessionId = await readSessionIdFromCookies();
      void logEvent("compass_query", {
        query_len: query.length,
        target_venue_id: result.target_id ?? null,
        latency_ms: Date.now() - startedAt,
      }, sessionId);
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
