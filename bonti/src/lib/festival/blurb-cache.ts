import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCachedBlurb(
  supabase: SupabaseClient,
  artistName: string,
  lang: "en" | "ro",
): Promise<string | null> {
  const { data, error } = await supabase
    .from("artist_blurbs")
    .select("blurb")
    .eq("artist_name", artistName)
    .eq("lang", lang)
    .maybeSingle();
  if (error) {
    console.warn("[blurb-cache] read error:", error.message);
    return null;
  }
  return data?.blurb ?? null;
}

export async function saveBlurb(
  supabase: SupabaseClient,
  artistName: string,
  lang: "en" | "ro",
  blurb: string,
): Promise<void> {
  const { error } = await supabase
    .from("artist_blurbs")
    .upsert({ artist_name: artistName, lang, blurb }, { onConflict: "artist_name,lang" });
  if (error) console.warn("[blurb-cache] write error:", error.message);
}
