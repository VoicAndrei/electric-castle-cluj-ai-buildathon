import { formatVenueForPrompt } from "@/lib/festival/compass";

const BONTI_ON_SITE = `
You are Bonți. You are guiding someone who is ON SITE at Electric Castle in Bonțida, Romania. The current time is approximately 21:43 on Saturday. Stay in flat-informational register — lead with the fact, not the greeting. Brand tokens (Main, Hangar, Banffy, Booha, EC Village, line up-ul) stay English even in Romanian sentences. Tu/voi only — never dumneavoastră.
`.trim();

export function buildCompassPrompt(args: { query: string; lang: "en" | "ro" }): string {
  const langName = args.lang === "ro" ? "Romanian" : "English";
  return `${BONTI_ON_SITE}

The user wants to know where to go. They typed:
"${args.query}"

Pick ONE place from this venue catalog that best matches their request. Use bonti_blurb (if present) and lineProbability to inform your choice.

VENUE CATALOG:
${formatVenueForPrompt()}

Respond with ONLY a JSON object — no markdown fences, no prose before or after:
{
  "target_id": "<one of the venue ids exactly>",
  "reason": "<one short sentence in ${langName}, under 200 chars, explaining the choice in Bonți voice>",
  "line_state": "<one short ${langName} phrase about wait/crowd, under 60 chars, inferred from lineProbability>"
}`;
}

export function buildConvergePrompt(args: {
  positions: { id: string; name: string; coords: { x: number; y: number } }[];
  lang: "en" | "ro";
}): string {
  const langName = args.lang === "ro" ? "Romanian" : "English";
  const positionsBlock = args.positions
    .map(p => `- ${p.name} (id=${p.id}) at (${p.coords.x}, ${p.coords.y})`)
    .join("\n");
  return `${BONTI_ON_SITE}

A group of ${args.positions.length} people is spread across the venue right now. Pick ONE venue point (preferably a stage or the EC Village) as the rendezvous that minimizes total walking time.

CURRENT POSITIONS:
${positionsBlock}

VENUE CATALOG:
${formatVenueForPrompt()}

Respond with ONLY a JSON object — no markdown fences, no prose before or after:
{
  "meeting_point_id": "<one of the venue ids exactly>",
  "eta_min": <integer 3-15, the longest walk in minutes>,
  "reason": "<one short sentence, under 200 chars, in Bonți voice>",
  "en": "<one short sentence in English, under 140 chars, that you'd push to all four phones>",
  "ro": "<the same sentence in Romanian, under 140 chars>"
}`;
}

export function buildBlurbPrompt(args: {
  artist: string;
  stage: string;
  day: string;
  ec_tags: string[];
  lang: "en" | "ro";
}): string {
  const langName = args.lang === "ro" ? "Romanian" : "English";
  return `${BONTI_ON_SITE}

Write a single sentence in ${langName} about the artist below — in Bonți's voice, max 160 characters, no greeting, no hype words ("epic", "unmissable", "awesome" are forbidden). Lead with image or fact.

Artist: ${args.artist}
Stage: ${args.stage}
Day: ${args.day}
EC tags: ${args.ec_tags.join(", ") || "(none)"}

Respond with ONLY the sentence — no quotes, no preamble.`;
}
