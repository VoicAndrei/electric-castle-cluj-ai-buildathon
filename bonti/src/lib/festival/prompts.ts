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

// Blurbs are a one-liner about *the artist*, not a schedule entry. We use
// a slimmer identity (no current-time anchor) because BONTI_ON_SITE's
// "current time is 21:43 Saturday" was leaking into the model's context
// and getting written back as the artist's set time. The explicit
// no-time guard in the prompt body is belt-and-braces.
const BONTI_BLURB_IDENTITY = `
You are Bonți, Electric Castle's on-site AI friend. Stay in flat-informational register — lead with image or fact, not the greeting. Brand tokens (Main, Hangar, Banffy, Booha, EC Village, line up-ul) stay English even in Romanian sentences. Tu/voi only — never dumneavoastră.
`.trim();

// Verdict the listener's prior /match run gave for the artist being viewed.
// "pick" / "skip" come from the stored match output; "unknown" means the
// listener has matched a playlist but the LLM didn't pick or skip this
// specific artist (i.e. the artist sat outside the top picks and the
// short skip list).
export type BlurbLibraryContext = {
  topArtists: string[];
  verdict: "pick" | "skip" | "unknown";
};

export function buildBlurbPrompt(args: {
  artist: string;
  stage: string;
  day: string;
  ec_tags: string[];
  lang: "en" | "ro";
  library?: BlurbLibraryContext;
}): string {
  const langName = args.lang === "ro" ? "Romanian" : "English";

  const baseRules = `Hard rules:
- Do NOT mention or invent a specific stage time — the artist's set time is not provided.
- Do NOT phrase the sentence as "X is on <day> at <time>". Talk about the music, the vibe, or one concrete reason to go.
- The day and stage are context only; do not parrot them back if it makes the line awkward.`;

  if (args.library) {
    const lib = args.library;
    const verdictLine =
      lib.verdict === "pick"
        ? `Your /match call already flagged this as a PICK for them.`
        : lib.verdict === "skip"
          ? `Your /match call already flagged this as a SKIP for them.`
          : `Your /match call didn't take a position on this artist — they may still want to go or skip; help them decide.`;

    return `${BONTI_BLURB_IDENTITY}

The listener has matched a Spotify playlist. Write ONE sentence in ${langName} that tells them how ${args.artist} fits *their* taste, max 200 characters.

Artist: ${args.artist}
Stage: ${args.stage}
Day: ${args.day}
EC tags: ${args.ec_tags.join(", ") || "(none)"}
Listener's top artists (in playback frequency order): ${lib.topArtists.join(", ") || "(none provided)"}
${verdictLine}

Personalization rules:
- Lead with a BRIDGE — name ONE of the listener's top artists this connects to (or contrasts with). Use the verdict to set the tone (a pick is reassurance, a skip is honest, unknown is a calm read).
- Be concrete about the music — vibe, instrumentation, energy. No hype words ("epic", "unmissable", "awesome" are forbidden).
- If none of the listener's top artists genuinely overlap with this artist, say so plainly and name the closest non-fit (e.g. "Nothing on your list sits near this — closest is X, and it's still a stretch").
${baseRules}

Respond with ONLY the sentence — no quotes, no preamble.`;
  }

  return `${BONTI_BLURB_IDENTITY}

Write a single sentence in ${langName} about the artist below — in Bonți's voice, max 160 characters, no greeting, no hype words ("epic", "unmissable", "awesome" are forbidden). Lead with image or fact.

Artist: ${args.artist}
Stage: ${args.stage}
Day: ${args.day}
EC tags: ${args.ec_tags.join(", ") || "(none)"}

${baseRules}

Respond with ONLY the sentence — no quotes, no preamble.`;
}
