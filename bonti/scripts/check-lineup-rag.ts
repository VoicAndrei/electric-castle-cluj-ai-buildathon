import { config } from "dotenv";
config({ path: ".env.local" });
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const sb = createAdminClient();
  const { count, error } = await sb
    .from("kb_chunks")
    .select("id", { count: "exact", head: true })
    .eq("source_doc", "lineup.json");
  if (error) throw error;
  console.log(`kb_chunks rows with source_doc=lineup.json: ${count}`);

  const { data: sample } = await sb
    .from("kb_chunks")
    .select("text, tags")
    .eq("source_doc", "lineup.json")
    .limit(3);
  for (const row of sample ?? []) console.log("-", row.text);

  const { count: total } = await sb
    .from("kb_chunks")
    .select("id", { count: "exact", head: true });
  console.log(`kb_chunks total rows: ${total}`);
}

void main();
