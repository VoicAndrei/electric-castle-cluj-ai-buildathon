import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
config({ path: ".env.local" });
import matter from "gray-matter";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedMany } from "@/lib/embeddings";
import { chunkText } from "@/lib/chunking";

type Lineup = Array<{
  artist: string;
  day: string;
  stage: string;
  ec_tags: string[];
  genres: string[];
}>;

type PendingRow = {
  source_doc: string;
  text: string;
  lang: string;
  tags: string[];
};

async function main() {
  const supabase = createAdminClient();

  console.log("Truncating kb_chunks...");
  const { error: delErr } = await supabase.from("kb_chunks").delete().neq("id", -1);
  if (delErr) throw delErr;

  const ingestDir = join(process.cwd(), "docs/ingest");
  const files = readdirSync(ingestDir);

  // Collect ALL rows first; embed in ONE batched Voyage call to respect 3 RPM free tier.
  const pending: PendingRow[] = [];

  for (const file of files) {
    const path = join(ingestDir, file);

    if (file.endsWith(".md")) {
      const raw = readFileSync(path, "utf-8");
      const { data: fm, content } = matter(raw);
      const lang = (fm.lang as string) ?? "en";
      const tags = (fm.tags as string[]) ?? [];
      const source_doc = file;

      const chunks = chunkText(content, { maxTokens: 500, overlap: 100 });
      console.log(`Queued ${source_doc}: ${chunks.length} chunks`);

      for (const chunk of chunks) {
        pending.push({ source_doc, text: chunk, lang, tags });
      }
    } else if (file === "lineup.json") {
      const raw: Lineup = JSON.parse(readFileSync(path, "utf-8"));
      console.log(`Queued lineup: ${raw.length} artists`);

      for (const a of raw) {
        const text = `${a.artist} plays at ${a.stage} on ${a.day}. EC tags: ${a.ec_tags.join(", ")}. Genres: ${a.genres.join(", ")}.`;
        pending.push({
          source_doc: "lineup.json",
          text,
          lang: "en",
          tags: ["lineup", "artist", ...a.ec_tags],
        });
      }
    }
  }

  console.log(`Embedding ${pending.length} chunks via Cohere...`);
  const vectors = await embedMany(pending.map((r) => r.text));

  console.log("Inserting into Supabase...");
  for (let i = 0; i < pending.length; i++) {
    const { error } = await supabase.from("kb_chunks").insert({
      source_doc: pending[i].source_doc,
      text: pending[i].text,
      embedding: Array.from(vectors[i]),
      lang: pending[i].lang,
      tags: pending[i].tags,
    });
    if (error) throw error;
  }

  const { count } = await supabase
    .from("kb_chunks")
    .select("*", { count: "exact", head: true });
  console.log(`Done. Total chunks: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
