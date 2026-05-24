import { createAdminClient } from "@/lib/supabase/admin";
import { detectSource, extractSpotifyPlaylistId } from "@/lib/music-match/url-detect";
import { fetchSpotifyPlaylist, type NormalizedPlaylist } from "@/lib/music-match/spotify";
import { parseFreeform } from "@/lib/music-match/freeform";
import { matchToLineup } from "@/lib/music-match/match-llm";
import { hashUrl, getCachedMatch, saveMatch } from "@/lib/music-match/cache";
import type { Lang } from "@/types/chat";
import { logEvent } from "@/lib/telemetry/log-event";
import { readSessionIdFromCookies } from "@/lib/telemetry/session";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { url?: string; freeform?: string; lang?: Lang };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const lang: Lang = body.lang ?? "en";
  const supabase = createAdminClient();

  let source: "spotify_url" | "ytmusic_url" | "apple_url" | "freeform";
  let normalized: NormalizedPlaylist;
  let cacheKey: string;

  if (body.url && body.url.trim()) {
    const detected = detectSource(body.url);
    if (!detected) {
      return Response.json({ error: "unsupported_url", message: "Paste a Spotify, YT Music or Apple Music playlist URL — or use the freeform option." }, { status: 400 });
    }
    if (detected !== "spotify_url") {
      return Response.json({ error: "source_not_yet_supported", message: `${detected} parsing lands in a later plan; use freeform for now.` }, { status: 501 });
    }
    const id = extractSpotifyPlaylistId(body.url);
    if (!id) return Response.json({ error: "invalid_spotify_url" }, { status: 400 });

    cacheKey = hashUrl(`spotify:${id}`);
    const cached = await getCachedMatch(supabase, cacheKey);
    if (cached) return Response.json(cached);

    try {
      normalized = await fetchSpotifyPlaylist(id);
    } catch (e) {
      return Response.json(
        { error: "spotify_fetch_failed", message: (e as Error).message },
        { status: 502 },
      );
    }
    source = "spotify_url";
  } else if (body.freeform && body.freeform.trim()) {
    normalized = parseFreeform(body.freeform);
    if (normalized.artists.length === 0) {
      return Response.json({ error: "empty_freeform" }, { status: 400 });
    }
    cacheKey = hashUrl(`freeform:${lang}:${normalized.artists.map((a) => a.name).join("|")}`);
    const cached = await getCachedMatch(supabase, cacheKey);
    if (cached) return Response.json(cached);
    source = "freeform";
  } else {
    return Response.json({ error: "missing_input", message: "Provide url or freeform." }, { status: 400 });
  }

  const output = await matchToLineup({ lang, normalized });
  await saveMatch(supabase, { urlHash: cacheKey, source, input: normalized, output });
  const sessionId = await readSessionIdFromCookies();
  void logEvent("match_completed", {
    artists_count: (output.picks?.length ?? 0) + (output.skips?.length ?? 0),
    top_artist: output.picks?.[0]?.artist ?? null,
    top_score: null,
    persona: null,
  }, sessionId);
  return Response.json(output);
}
