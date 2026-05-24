import { z } from "zod";
import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 30;

const DayEnum = z.enum(["Thursday", "Friday", "Saturday", "Sunday"]);

const BodySchema = z.object({
  day: DayEnum.default("Saturday"),
  current_time: z.string().default("21:43"),
  match_picks: z.array(z.string().min(1).max(80)).max(15).default([]),
});

const UpNextPickSchema = z.object({
  artist: z.string().min(1),
  stage: z.string().min(1),
  when: z.string().min(1).max(80),
  reason: z.string().min(1).max(220),
});
const UpNextSchema = z.object({
  intro: z.string().min(1).max(220),
  picks: z.array(UpNextPickSchema).min(1).max(4),
});

function buildPrompt(input: {
  day: string;
  currentTime: string;
  lineup: Array<{ artist: string; stage: string; ec_tags: string[] }>;
  matchPicks: string[];
}): string {
  const lineupBlock = input.lineup
    .map((a) => `- ${a.artist} (${a.stage}) — ${a.ec_tags.join(", ") || "no tags"}`)
    .join("\n");
  const tasteBlock =
    input.matchPicks.length > 0
      ? `User's already-matched picks (their taste skews here): ${input.matchPicks.join(", ")}`
      : "User has no prior taste signal stored.";

  return `You are Bonți. It's ${input.currentTime} on ${input.day} at Electric Castle 2026.
The user is on-site and wants to know what to catch next.

${input.day}'s artists (already-passed sets included for context — pick only future-feeling ones):
${lineupBlock}

${tasteBlock}

Voice rules:
- Image-first, no padding. Two-clause beats: image + counter-fact. ("Sweat first, sit later.")
- Brand tokens stay English. No "Hey", no "feel free to", no markdown bold.
- Each reason ties WHY this set fits the user's taste (if matchPicks given) or what mood/moment it serves.
- "when" is conversational ("starting any minute", "midnight set", "after the headliner"), not a clock time.

Recommend 2-3 sets to catch in the next 2-4 hours. Prioritize matched-taste picks if any. Mix one safe bet with one discovery.

Respond with ONLY a JSON object — no markdown fences, no preamble:
{
  "intro": "<one-sentence vibe-read for the next few hours>",
  "picks": [
    { "artist": "<name>", "stage": "<stage>", "when": "<conversational timing>", "reason": "<why this set, in Bonți voice>" }
  ]
}`;
}

function extractJson(text: string) {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(stripped.slice(start, end + 1));
}

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "bad_request", detail: (e as Error).message }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lineup_entries")
    .select("artist_name, stage, ec_tags")
    .eq("day", body.day)
    .order("sort_order", { ascending: true });
  if (error) {
    return Response.json({ error: "lineup_read_failed", detail: error.message }, { status: 500 });
  }
  const lineup = (data ?? []).map((r) => ({
    artist: r.artist_name as string,
    stage: r.stage as string,
    ec_tags: (r.ec_tags as string[] | null) ?? [],
  }));
  if (lineup.length === 0) {
    return Response.json({ error: "empty_lineup_for_day" }, { status: 404 });
  }

  const prompt = buildPrompt({
    day: body.day,
    currentTime: body.current_time,
    lineup,
    matchPicks: body.match_picks,
  });

  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "openai-gpt-5.4-mini" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxRetries: 0,
      });
      if (!text?.trim()) {
        lastErr = new Error(`Empty response from ${label}`);
        continue;
      }
      const raw = extractJson(text);
      const parsed = UpNextSchema.parse(raw);
      return Response.json(parsed);
    } catch (e) {
      lastErr = e;
      console.warn(`[up-next] ${label} threw:`, (e as Error).message);
    }
  }

  return Response.json(
    { error: "llm_unavailable", detail: lastErr instanceof Error ? lastErr.message : "unknown" },
    { status: 503 },
  );
}
