import type { NormalizedPlaylist } from "./spotify";

export function parseFreeform(input: string): NormalizedPlaylist {
  const counts = new Map<string, number>();
  for (const raw of input.split(/[\n,]+/)) {
    const name = raw.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const artists = [...counts.entries()]
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));
  return { artists, tracks: [] };
}
