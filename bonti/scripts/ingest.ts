import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { createAdminClient } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";
import { chunkText } from "@/lib/chunking";

type Lineup = Array<{
  artist: string;
  day: string;
  stage: string;
  ec_tags: string[];
  genres: string[];
}>;

async function ingestMarkdown(filePath: string, supabase: ReturnType<typeof createAdminClient>) {
  const raw = readFileSync(filePath, "utf-8");
  const { data: fm, content } = matter(raw);
  const lang = (fm.lang as string) ?? "en";
  const tags = (fm.tags as string[]) ?? [];
  const source_doc = filePath.split("/").pop()!;

  const chunks = chunkText(content, { maxTokens: 500, overlap: 100 });
  console.log(`Ingesting ${source_doc}: ${chunks.length} chunks`);

  for (const chunk of chunks) {
    const vector = await embed(chunk);
    const { error } = await supabase.from("kb_chunks").insert({
      source_doc,
      text: chunk,
      embedding: Array.from(vector),
      lang,
      tags,
    });
    if (error) throw error;
  }
}

async function ingestLineup(filePath: string, supabase: ReturnType<typeof createAdminClient>) {
  const raw: Lineup = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log(`Ingesting lineup: ${raw.length} artists`);

  for (const a of raw) {
    const text = `${a.artist} plays at ${a.stage} on ${a.day}. EC tags: ${a.ec_tags.join(", ")}. Genres: ${a.genres.join(", ")}.`;
    const vector = await embed(text);
    const { error } = await supabase.from("kb_chunks").insert({
      source_doc: "lineup.json",
      text,
      embedding: Array.from(vector),
      lang: "en",
      tags: ["lineup", "artist", ...a.ec_tags],
    });
    if (error) throw error;
  }
}

async function main() {
  const supabase = createAdminClient();

  console.log("Truncating kb_chunks...");
  const { error: delErr } = await supabase.from("kb_chunks").delete().neq("id", -1);
  if (delErr) throw delErr;

  const ingestDir = join(process.cwd(), "docs/ingest");
  const files = readdirSync(ingestDir);

  for (const file of files) {
    const path = join(ingestDir, file);
    if (file.endsWith(".md")) {
      await ingestMarkdown(path, supabase);
    } else if (file === "lineup.json") {
      await ingestLineup(path, supabase);
    }
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
