import { config } from "dotenv";
config({ path: ".env.local" });
import { fetchSpotifyPlaylist } from "@/lib/music-match/spotify";

async function main() {
  const id = process.argv[2] ?? "2VnOCjFizTjnzbOEbWh3CS";
  console.log(`Fetching playlist ${id} via embed scrape...`);
  const t0 = Date.now();
  const result = await fetchSpotifyPlaylist(id);
  const ms = Date.now() - t0;
  console.log(`Done in ${ms}ms.`);
  console.log(`Tracks: ${result.tracks.length}`);
  console.log(`Unique artists: ${result.artists.length}`);
  console.log(`Top 8 artists by frequency:`);
  for (const a of result.artists.slice(0, 8)) {
    console.log(`  ${a.frequency.toString().padStart(3)}x  ${a.name}`);
  }
  console.log(`First 5 tracks:`);
  for (const t of result.tracks.slice(0, 5)) {
    console.log(`  - ${t.title} — ${t.artist}`);
  }
}

void main();
