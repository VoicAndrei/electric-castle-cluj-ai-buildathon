import { VENUE, METERS_PER_UNIT, type VenuePoint } from "@/data/venue";
import { LINEUP, type LineupEntry } from "@/data/lineup-static";

// Maps lineup `stage` strings to the venue catalog id. Lineup uses titlecased
// "Main Stage" / "The Beach Stage"; the venue catalog uses snake_case ids.
// The list is exhaustive against the EC25 lineup as of this commit; if a
// lineup entry uses a stage that isn't in this map, the artist lookup
// silently skips it (the LLM path still handles the query).
const STAGE_TO_VENUE_ID: Record<string, string> = {
  "Main Stage": "main_stage",
  "Hangar Stage": "hangar_stage",
  "Booha Stage": "booha_stage",
  "Banffy Castle": "banffy_stage",
  "Banffy Stage": "banffy_stage",
  "The Beach Stage": "beach_stage",
  "Beach Stage": "beach_stage",
  "Hideout Stage": "hideout_stage",
  "Backyard Stage": "backyard_stage",
  "Ping Pong Stage": "ping_pong_stage",
  "Stables Stage": "stables_stage",
};

export function venueIdForStage(stage: string): string | undefined {
  return STAGE_TO_VENUE_ID[stage];
}

/**
 * Returns the lineup entry whose artist name is mentioned in the user's
 * query, if any. Match is case-insensitive substring with whole-word
 * boundaries to avoid short artist names ("ANNA", "ZO") colliding with
 * common English words inside the query string. When multiple artists
 * match, the longest name wins.
 */
export function findArtistInQuery(query: string): LineupEntry | null {
  const q = ` ${query.toLowerCase().normalize("NFKD")} `;
  let best: LineupEntry | null = null;
  let bestLen = 0;
  for (const entry of LINEUP) {
    const name = entry.artist.toLowerCase().normalize("NFKD");
    if (name.length < 3) continue;
    const padded = ` ${name} `;
    // Word-boundary check via space padding — `q.includes(padded)` ensures
    // the artist is a standalone token, not a substring inside another word.
    if (q.includes(padded) && name.length > bestLen) {
      best = entry;
      bestLen = name.length;
    }
  }
  return best;
}

export function distanceMeters(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy) * METERS_PER_UNIT;
}

// 0 = north (target above), 90 = east, CW positive
export function bearingDegrees(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y; // SVG y grows downward; "north" = lower y
  let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
}

export function formatWalkTime(meters: number): string {
  if (meters < 30) return "<1 min";
  const minutes = Math.round(meters / 65); // ~65 m/min slow walking through a crowd
  return `~${Math.max(1, minutes)} min`;
}

export function formatVenueForPrompt(): string {
  return VENUE.map(v => {
    const tags = [
      `id=${v.id}`,
      `kind=${v.kind}`,
      v.lineProbability ? `lineProbability=${v.lineProbability}` : null,
      v.bonti_blurb ? `note="${v.bonti_blurb}"` : null,
    ].filter(Boolean).join(" ");
    return `- ${v.name} [${tags}]`;
  }).join("\n");
}

export function findVenueById(id: string): VenuePoint | undefined {
  return VENUE.find(v => v.id === id);
}
