import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
config({ path: ".env.local" });
import { createAdminClient } from "@/lib/supabase/admin";

type LineupJson = Array<{
  artist: string;
  day: "Thursday" | "Friday" | "Saturday" | "Sunday";
  stage: string;
  start_at?: string | null;
  end_at?: string | null;
  ec_tags: string[];
  genres: string[];
}>;

async function main() {
  const sb = createAdminClient();
  const raw = readFileSync(join(process.cwd(), "docs/ingest/lineup.json"), "utf-8");
  const lineup: LineupJson = JSON.parse(raw);

  console.log(`Relaxing day check constraint (idempotent)...`);
  const { error: ddlErr } = await sb.rpc("exec_sql", {
    q:
      "alter table public.lineup_entries drop constraint if exists lineup_entries_day_check; " +
      "alter table public.lineup_entries add constraint lineup_entries_day_check " +
      "check (day in ('Thursday','Friday','Saturday','Sunday'));",
  });
  if (ddlErr) {
    // exec_sql RPC may not exist; ignore and assume migration applied separately.
    console.warn(`  (skipping DDL via RPC: ${ddlErr.message})`);
  }

  console.log(`Truncating lineup_entries...`);
  const { error: delErr } = await sb
    .from("lineup_entries")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;

  const rows = lineup.map((a, i) => ({
    artist_name: a.artist,
    day: a.day,
    stage: a.stage,
    start_at: a.start_at ?? null,
    end_at: a.end_at ?? null,
    ec_tags: a.ec_tags ?? [],
    genres: a.genres ?? [],
    sort_order: i * 10,
  }));

  console.log(`Inserting ${rows.length} rows...`);
  const { error: insErr } = await sb.from("lineup_entries").insert(rows);
  if (insErr) throw insErr;

  const { count } = await sb
    .from("lineup_entries")
    .select("id", { count: "exact", head: true });
  console.log(`Done. lineup_entries total rows: ${count}`);
}

void main();
