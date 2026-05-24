import { createAdminClient } from "../src/lib/supabase/admin";

// One-shot: clears every row from artist_blurbs so the next blurb fetch
// regenerates against the current prompt. Run after changing the blurb
// prompt template — the cache key is (artist_name, lang) with no prompt
// version, so stale entries survive prompt updates without this wipe.
//
// Invoke with:
//   pnpm exec dotenv -e .env.local -- tsx scripts/clear-blurb-cache.ts
async function main(): Promise<void> {
  const supabase = createAdminClient();
  const { count: before } = await supabase
    .from("artist_blurbs")
    .select("*", { count: "exact", head: true });

  // Supabase requires a filter for `.delete()` — `.neq("artist_name", "")`
  // matches every row (no artist has an empty name).
  const { error } = await supabase
    .from("artist_blurbs")
    .delete()
    .neq("artist_name", "");
  if (error) {
    console.error("[clear-blurb-cache] delete failed:", error.message);
    process.exit(1);
  }

  const { count: after } = await supabase
    .from("artist_blurbs")
    .select("*", { count: "exact", head: true });

  console.log(`[clear-blurb-cache] before=${before ?? "?"} after=${after ?? "?"}`);
}

void main();
