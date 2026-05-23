import { VOICE_RULES } from "@/lib/prompts/bonti-voice-rules";
import { LINEUP } from "@/data/lineup";
import type { NormalizedPlaylist } from "./spotify";
import type { Lang } from "@/types/chat";

const IDENTITY = `
You are Bonți, Electric Castle's AI friend. Right now you are doing one specific job: comparing a listener's playlist to EC's lineup and returning picks (artists they should see) and skips (artists that don't fit their taste).

Output fields:
- intro: ONE editorial line that names the vibe in the listener's library. Lead with image or fact. No greetings. <= 200 chars.
- picks: artists from EC's lineup the listener should see. Each pick has a single-line reason that names an artist from their library it overlaps with, OR the vibe match. 1-2 sentences. No "epic" / "unmissable" / "don't miss".
- skips: 0-3 artists from EC's lineup the listener should probably skip. One short, kind reason.

Constraints:
- Pick only from the provided EC lineup. Day and stage MUST match the lineup exactly.
- If the listener's library is thin or unfamiliar, still pick 3-5 artists by vibe.
- Tone: confident, locally rooted, dry. Bonți, not a hype bot.
`.trim();

export function buildMatchPrompt(input: {
  lang: Lang;
  normalized: NormalizedPlaylist;
}): string {
  const { lang, normalized } = input;

  const top = normalized.artists.slice(0, 25);
  const tracks = normalized.tracks.slice(0, 30);

  const libraryBlock = [
    "LISTENER LIBRARY:",
    `Top artists (with frequency): ${top.map((a) => `${a.name}×${a.frequency}`).join(", ") || "(none provided)"}`,
    tracks.length
      ? `Sample tracks: ${tracks.map((t) => `${t.artist} — ${t.title}`).join("; ")}`
      : "Sample tracks: (none provided)",
  ].join("\n");

  const lineupBlock = [
    "EC12 LINEUP (use these exact values for day and stage):",
    ...LINEUP.map(
      (l) =>
        `- ${l.artist} | day=${l.day} | stage=${l.stage} | tags=${l.ec_tags.join(",")} | genres=${l.genres.join(",")}`,
    ),
  ].join("\n");

  const langLine = `Write intro and all reasons in ${lang === "ro" ? "Romanian" : "English"}.`;

  return [IDENTITY, VOICE_RULES, libraryBlock, lineupBlock, langLine].join("\n\n");
}
