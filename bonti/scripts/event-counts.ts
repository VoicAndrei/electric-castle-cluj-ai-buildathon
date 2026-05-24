/**
 * Prints last 7 days of events grouped by type. Used in the Plan 3b demo beat.
 *   pnpm tsx scripts/event-counts.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("type")
    .gte("created_at", since);

  if (error) {
    console.error("[event-counts] failed:", error.message);
    process.exit(1);
  }

  const counts = (data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  console.table(rows);
  console.log(`\n(${data?.length ?? 0} events in last 7 days)`);
}

void main();
