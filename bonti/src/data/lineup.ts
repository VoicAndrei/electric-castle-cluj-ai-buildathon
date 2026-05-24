import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LINEUP, type LineupEntry } from "./lineup-static";

export { LINEUP };
export type { LineupEntry };

// ---- DB-backed (Plan 3b-2) ----

export type LineupRow = {
  id: string;
  artist_name: string;
  day: "Thursday" | "Friday" | "Saturday" | "Sunday";
  stage: string;
  start_at: string | null;
  end_at: string | null;
  ec_tags: string[];
  genres: string[];
  photo_url: string | null;
  sort_order: number;
};

export async function loadLineup(): Promise<LineupRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lineup_entries")
      .select(
        "id, artist_name, day, stage, start_at, end_at, ec_tags, genres, photo_url, sort_order",
      )
      .order("day", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("artist_name", { ascending: true });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("empty");
    return data as LineupRow[];
  } catch (e) {
    console.error(
      "[lineup] DB read failed, falling back to static JSON:",
      (e as Error).message,
    );
    return staticFallback();
  }
}

function staticFallback(): LineupRow[] {
  return LINEUP.map((e, i) => ({
    id: `static-${i}`,
    artist_name: e.artist,
    day: e.day,
    stage: e.stage,
    start_at: e.start_at ?? null,
    end_at: e.end_at ?? null,
    ec_tags: e.ec_tags ?? [],
    genres: e.genres ?? [],
    photo_url: null,
    sort_order: i * 10,
  }));
}
