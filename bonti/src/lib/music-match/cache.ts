import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchOutput } from "./match-schema";
import type { NormalizedPlaylist } from "./spotify";

export function hashUrl(input: string): string {
  const normalized = input.trim().replace(/\/+$/, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedMatch(
  supabase: SupabaseClient,
  urlHash: string,
): Promise<MatchOutput | null> {
  const { data, error } = await supabase
    .from("music_matches")
    .select("output")
    .eq("url_hash", urlHash)
    .maybeSingle();
  if (error || !data) return null;
  return data.output as MatchOutput;
}

export async function saveMatch(
  supabase: SupabaseClient,
  args: {
    urlHash: string;
    source: "spotify_url" | "ytmusic_url" | "apple_url" | "freeform";
    input: NormalizedPlaylist;
    output: MatchOutput;
  },
): Promise<void> {
  const { error } = await supabase.from("music_matches").upsert(
    {
      url_hash: args.urlHash,
      source: args.source,
      input: args.input,
      output: args.output,
    },
    { onConflict: "url_hash" },
  );
  if (error) throw error;
}
