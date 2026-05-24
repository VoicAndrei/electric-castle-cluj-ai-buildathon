import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildBlurbPrompt, type BlurbLibraryContext } from "@/lib/festival/prompts";
import { getCachedBlurb, saveBlurb } from "@/lib/festival/blurb-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { LINEUP } from "@/data/lineup";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  artist?: string;
  lang?: "en" | "ro";
  // When the caller has the listener's matched playlist context, pass it
  // here to get a personalized "does this artist fit me?" line instead of
  // the generic artist blurb. We bypass the blurb cache for personalized
  // calls — different listeners would otherwise overwrite each other's
  // cached entry for the same artist.
  library?: BlurbLibraryContext;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const artist = body.artist?.trim();
  if (!artist) return new Response("Missing artist", { status: 400 });
  const lang = body.lang ?? "en";
  const library = body.library;

  const sb = createAdminClient();

  if (!library) {
    const cached = await getCachedBlurb(sb, artist, lang);
    if (cached) {
      return new Response(cached, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  const row = LINEUP.find(l => l.artist.toLowerCase() === artist.toLowerCase());
  if (!row) return new Response("Unknown artist", { status: 404 });

  const prompt = buildBlurbPrompt({
    artist: row.artist,
    stage: row.stage,
    day: row.day,
    ec_tags: row.ec_tags,
    lang,
    library,
  });

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
        model, prompt, temperature: 0.5, maxRetries: 0, abortSignal: controller.signal,
      });
      clearTimeout(timer);
      const blurb = text?.trim();
      if (!blurb) throw new Error(`Empty from ${label}`);
      // Only cache the non-personalized variant — personalized lines depend
      // on each listener's library and would otherwise collide on cache key.
      if (!library) await saveBlurb(sb, row.artist, lang, blurb);
      return new Response(blurb, { headers: { "content-type": "text/plain; charset=utf-8" } });
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[blurb] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Blurb unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
