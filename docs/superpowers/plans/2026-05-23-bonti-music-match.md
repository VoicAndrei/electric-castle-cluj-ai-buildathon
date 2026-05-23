# Bonți — Music Match (Plan 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Music Match feature (Act 2 of the demo arc): user pastes a Spotify playlist URL — or any list of artists — Bonți compares to EC's lineup and returns picks + skips with vibe-led commentary, in EN or RO.

**Architecture:** New surface at `/match` with a paste-or-type form. Server route `/api/match` detects Spotify URLs (Web API client_credentials → public playlist tracks), normalizes to `{artists, tracks}`, calls Gemma via `generateObject` against the bundled lineup, caches results in `music_matches` keyed by URL hash, and returns `{intro, picks, skips}`. Freeform textarea path always works (no Spotify creds required) — this is the demo's safety net per spec §8.4.

**Tech Stack:** Same as foundation — Next.js 16, Tailwind v4, shadcn/ui, Supabase (`music_matches` table already migrated), OpenRouter `BONTI_LLM` + fallback chain, Vercel AI SDK `generateObject` for structured output, vitest, zod (already a transitive dep via `ai`).

**Demo scope:** Spotify URL paste is the headline path; YT Music / Apple Music URL parsing is deferred to a later plan. Freeform textarea ships in this plan so the demo never fails on credentials or playlist privacy.

---

## File Structure

```
bonti/
  src/
    data/
      lineup.ts                          NEW — bundles docs/ingest/lineup.json with types
    lib/
      music-match/
        url-detect.ts                    NEW — source detection + Spotify ID extraction
        spotify.ts                       NEW — token fetch + playlist fetch + normalize
        freeform.ts                      NEW — parse textarea into {artists, tracks}
        match-prompt.ts                  NEW — system + user prompt for match LLM
        match-schema.ts                  NEW — zod schema for {intro, picks, skips}
        match-llm.ts                     NEW — generateObject with fallback chain
        cache.ts                         NEW — url_hash + Supabase read/write helpers
    app/
      api/
        match/
          route.ts                       NEW — POST handler
      match/
        page.tsx                         NEW — paste-or-type form + results
    components/
      match-form.tsx                     NEW — URL input + freeform toggle
      match-card.tsx                     NEW — picks + skips render
      match-loading.tsx                  NEW — "Bonți is listening…" shimmer
      bonti-header.tsx                   MODIFY — add /match link
  tests/
    unit/
      url-detect.test.ts                 NEW
      freeform.test.ts                   NEW
      match-schema.test.ts               NEW
      cache.test.ts                      NEW
      spotify.test.ts                    NEW — mocked fetch
    integration/
      match-route.test.ts                NEW — exercises POST /api/match
  .env.example                           MODIFY — add Spotify vars
  .env.local                             MODIFY — user fills Spotify creds (or skips)
```

---

### Task 1: Bundle lineup data + add Spotify env vars

**Files:**
- Create: `bonti/src/data/lineup.ts`
- Modify: `bonti/.env.example`
- Modify: `bonti/.env.local` (user adds real keys — leave placeholders if missing, freeform path still works)

- [ ] **Step 1: Add lineup module that imports the JSON with types**

Create `bonti/src/data/lineup.ts`:

```ts
import lineupJson from "../../docs/ingest/lineup.json";

export type LineupEntry = {
  artist: string;
  day: "Friday" | "Saturday" | "Sunday";
  stage: "Main Stage" | "Hangar Stage" | "Booha Stage" | string;
  ec_tags: string[];
  genres: string[];
};

export const LINEUP: LineupEntry[] = lineupJson as LineupEntry[];
```

- [ ] **Step 2: Append Spotify keys to `.env.example`**

Append to `bonti/.env.example`:

```
# Spotify (music match — public-playlist read via client_credentials)
# Register at developer.spotify.com → create app → copy below.
# Leave blank to disable Spotify URL parsing; freeform textarea still works.
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

- [ ] **Step 3: Mirror the same lines into `.env.local`**

Append to `bonti/.env.local` (do NOT overwrite existing values):

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

- [ ] **Step 4: Verify import resolves**

Run: `cd bonti && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/data/lineup.ts .env.example .env.local
git commit -m "feat(match): bundle lineup data + spotify env scaffolding"
```

---

### Task 2: URL detection + Spotify playlist-ID extraction

**Files:**
- Create: `bonti/src/lib/music-match/url-detect.ts`
- Create: `bonti/tests/unit/url-detect.test.ts`

- [ ] **Step 1: Write failing tests**

Create `bonti/tests/unit/url-detect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectSource, extractSpotifyPlaylistId } from "@/lib/music-match/url-detect";

describe("detectSource", () => {
  it("detects Spotify playlist URLs", () => {
    expect(detectSource("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe("spotify_url");
    expect(detectSource("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc")).toBe("spotify_url");
  });

  it("detects YT Music URLs", () => {
    expect(detectSource("https://music.youtube.com/playlist?list=PLabc")).toBe("ytmusic_url");
    expect(detectSource("https://www.youtube.com/playlist?list=PLabc")).toBe("ytmusic_url");
  });

  it("detects Apple Music URLs", () => {
    expect(detectSource("https://music.apple.com/us/playlist/chill/pl.abc")).toBe("apple_url");
  });

  it("returns null for non-playlist URLs", () => {
    expect(detectSource("https://example.com")).toBeNull();
    expect(detectSource("not a url")).toBeNull();
    expect(detectSource("")).toBeNull();
  });
});

describe("extractSpotifyPlaylistId", () => {
  it("extracts the playlist ID", () => {
    expect(extractSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(extractSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xyz")).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("returns null for non-playlist URLs", () => {
    expect(extractSpotifyPlaylistId("https://open.spotify.com/track/abc")).toBeNull();
    expect(extractSpotifyPlaylistId("garbage")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd bonti && pnpm test tests/unit/url-detect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `bonti/src/lib/music-match/url-detect.ts`:

```ts
export type MusicSource = "spotify_url" | "ytmusic_url" | "apple_url";

export function detectSource(input: string): MusicSource | null {
  const url = safeUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "open.spotify.com" && url.pathname.startsWith("/playlist/")) return "spotify_url";
  if (host === "music.youtube.com" || host === "www.youtube.com" || host === "youtube.com") {
    if (url.searchParams.has("list")) return "ytmusic_url";
  }
  if (host === "music.apple.com" && url.pathname.includes("/playlist/")) return "apple_url";
  return null;
}

export function extractSpotifyPlaylistId(input: string): string | null {
  const url = safeUrl(input);
  if (!url || url.hostname.toLowerCase() !== "open.spotify.com") return null;
  const match = url.pathname.match(/^\/playlist\/([A-Za-z0-9]+)\/?$/);
  return match ? match[1] : null;
}

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd bonti && pnpm test tests/unit/url-detect.test.ts`
Expected: PASS, 7/7.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/lib/music-match/url-detect.ts tests/unit/url-detect.test.ts
git commit -m "feat(match): detect spotify/ytmusic/apple playlist URLs"
```

---

### Task 3: Spotify client_credentials + playlist fetch

**Files:**
- Create: `bonti/src/lib/music-match/spotify.ts`
- Create: `bonti/tests/unit/spotify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `bonti/tests/unit/spotify.test.ts`:

```ts
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fetchSpotifyPlaylist, _resetTokenCacheForTests } from "@/lib/music-match/spotify";

const FAKE_TOKEN_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" }),
} as unknown as Response;

const FAKE_PLAYLIST_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({
    tracks: {
      items: [
        { track: { name: "Heat Waves", artists: [{ name: "Glass Animals" }] } },
        { track: { name: "Lost in Yesterday", artists: [{ name: "Tame Impala" }] } },
        { track: { name: "Glass Animals deep cut", artists: [{ name: "Glass Animals" }] } },
        { track: null },
      ],
      next: null,
    },
  }),
} as unknown as Response;

describe("fetchSpotifyPlaylist", () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    _resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the token then the playlist, normalizes artists with frequency", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(FAKE_TOKEN_RESPONSE)
      .mockResolvedValueOnce(FAKE_PLAYLIST_RESPONSE);

    const result = await fetchSpotifyPlaylist("playlist123");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://accounts.spotify.com/api/token");
    expect((fetchMock.mock.calls[1][0] as string)).toContain("/playlists/playlist123");

    expect(result.tracks).toHaveLength(3); // null track filtered out
    expect(result.artists).toEqual([
      { name: "Glass Animals", frequency: 2 },
      { name: "Tame Impala", frequency: 1 },
    ]);
  });

  it("throws if creds are missing", async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    await expect(fetchSpotifyPlaylist("p1")).rejects.toThrow(/SPOTIFY_CLIENT_ID/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd bonti && pnpm test tests/unit/spotify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `bonti/src/lib/music-match/spotify.ts`:

```ts
export type NormalizedTrack = { title: string; artist: string };
export type NormalizedArtist = { name: string; frequency: number };
export type NormalizedPlaylist = {
  tracks: NormalizedTrack[];
  artists: NormalizedArtist[];
};

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

export function _resetTokenCacheForTests() {
  tokenCache = null;
}

async function getSpotifyToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID not set");
  if (!secret) throw new Error("SPOTIFY_CLIENT_SECRET not set");

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

type SpotifyTrackItem = {
  track: { name: string; artists: Array<{ name: string }> } | null;
};
type SpotifyPlaylistPage = {
  tracks: { items: SpotifyTrackItem[]; next: string | null };
};

export async function fetchSpotifyPlaylist(playlistId: string): Promise<NormalizedPlaylist> {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=tracks(items(track(name,artists(name))),next)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify playlist fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as SpotifyPlaylistPage;

  const tracks: NormalizedTrack[] = [];
  const artistCounts = new Map<string, number>();
  for (const item of json.tracks.items) {
    if (!item.track) continue;
    const t = item.track;
    const primary = t.artists[0]?.name ?? "Unknown";
    tracks.push({ title: t.name, artist: primary });
    for (const a of t.artists) {
      artistCounts.set(a.name, (artistCounts.get(a.name) ?? 0) + 1);
    }
  }
  const artists: NormalizedArtist[] = [...artistCounts.entries()]
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));

  return { tracks, artists };
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd bonti && pnpm test tests/unit/spotify.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/lib/music-match/spotify.ts tests/unit/spotify.test.ts
git commit -m "feat(match): spotify token cache + playlist fetcher with normalization"
```

---

### Task 4: Freeform parser (textarea → normalized input)

**Files:**
- Create: `bonti/src/lib/music-match/freeform.ts`
- Create: `bonti/tests/unit/freeform.test.ts`

- [ ] **Step 1: Write failing tests**

Create `bonti/tests/unit/freeform.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseFreeform } from "@/lib/music-match/freeform";

describe("parseFreeform", () => {
  it("splits comma- and newline-separated artist lists", () => {
    const result = parseFreeform("Glass Animals, Tame Impala\nFred again..\nLP, LP");
    expect(result.artists.map((a) => a.name)).toEqual(["Glass Animals", "Tame Impala", "Fred again..", "LP"]);
    expect(result.artists.find((a) => a.name === "LP")?.frequency).toBe(2);
    expect(result.tracks).toEqual([]);
  });

  it("ignores empty lines and whitespace", () => {
    const result = parseFreeform("\n  Glass Animals  \n\n,\n LP \n");
    expect(result.artists.map((a) => a.name)).toEqual(["Glass Animals", "LP"]);
  });

  it("returns empty arrays for blank input", () => {
    const result = parseFreeform("");
    expect(result.artists).toEqual([]);
    expect(result.tracks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd bonti && pnpm test tests/unit/freeform.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `bonti/src/lib/music-match/freeform.ts`:

```ts
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
```

- [ ] **Step 4: Verify tests pass**

Run: `cd bonti && pnpm test tests/unit/freeform.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/lib/music-match/freeform.ts tests/unit/freeform.test.ts
git commit -m "feat(match): freeform textarea parser as Spotify-less fallback"
```

---

### Task 5: Match schema (zod) + prompt builder

**Files:**
- Create: `bonti/src/lib/music-match/match-schema.ts`
- Create: `bonti/src/lib/music-match/match-prompt.ts`
- Create: `bonti/tests/unit/match-schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `bonti/tests/unit/match-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MatchOutputSchema } from "@/lib/music-match/match-schema";

describe("MatchOutputSchema", () => {
  it("accepts a minimal valid match", () => {
    const ok = MatchOutputSchema.parse({
      intro: "Your taste leans synth + indie.",
      picks: [
        { artist: "Glass Animals", day: "Saturday", stage: "Main Stage", reason: "Tame Impala overlap is real." },
      ],
      skips: [],
    });
    expect(ok.picks[0].artist).toBe("Glass Animals");
  });

  it("rejects picks missing required fields", () => {
    expect(() =>
      MatchOutputSchema.parse({
        intro: "x",
        picks: [{ artist: "X" }],
        skips: [],
      }),
    ).toThrow();
  });

  it("clamps overly large arrays", () => {
    const big = Array.from({ length: 50 }, (_, i) => ({
      artist: `A${i}`,
      day: "Friday",
      stage: "Main Stage",
      reason: "r",
    }));
    expect(() => MatchOutputSchema.parse({ intro: "x", picks: big, skips: [] })).toThrow(); // capped at 12
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd bonti && pnpm test tests/unit/match-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement schema**

Create `bonti/src/lib/music-match/match-schema.ts`:

```ts
import { z } from "zod";

export const MatchPickSchema = z.object({
  artist: z.string().min(1),
  day: z.enum(["Friday", "Saturday", "Sunday"]),
  stage: z.string().min(1),
  reason: z.string().min(1).max(200),
});

export const MatchSkipSchema = z.object({
  artist: z.string().min(1),
  reason: z.string().min(1).max(160),
});

export const MatchOutputSchema = z.object({
  intro: z.string().min(1).max(280),
  picks: z.array(MatchPickSchema).max(12),
  skips: z.array(MatchSkipSchema).max(6),
});

export type MatchOutput = z.infer<typeof MatchOutputSchema>;
export type MatchPick = z.infer<typeof MatchPickSchema>;
export type MatchSkip = z.infer<typeof MatchSkipSchema>;
```

- [ ] **Step 4: Implement prompt**

Create `bonti/src/lib/music-match/match-prompt.ts`:

```ts
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
```

- [ ] **Step 5: Verify schema tests pass**

Run: `cd bonti && pnpm test tests/unit/match-schema.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 6: Commit**

```bash
cd bonti
git add src/lib/music-match/match-schema.ts src/lib/music-match/match-prompt.ts tests/unit/match-schema.test.ts
git commit -m "feat(match): zod schema + voice-aware prompt for match LLM"
```

---

### Task 6: Match LLM call with fallback chain

**Files:**
- Create: `bonti/src/lib/music-match/match-llm.ts`
- Create: `bonti/tests/integration/match-llm.test.ts`

- [ ] **Step 1: Write a real-LLM integration test**

Create `bonti/tests/integration/match-llm.test.ts`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect } from "vitest";
import { matchToLineup } from "@/lib/music-match/match-llm";

describe("matchToLineup (real LLM)", () => {
  it("returns picks from the EC lineup for a synthwave/indie library", async () => {
    const out = await matchToLineup({
      lang: "en",
      normalized: {
        artists: [
          { name: "Tame Impala", frequency: 4 },
          { name: "Fred again..", frequency: 3 },
          { name: "LP", frequency: 2 },
        ],
        tracks: [],
      },
    });
    expect(out.intro.length).toBeGreaterThan(8);
    expect(out.picks.length).toBeGreaterThan(0);
    for (const p of out.picks) {
      expect(["Friday", "Saturday", "Sunday"]).toContain(p.day);
      expect(typeof p.reason).toBe("string");
    }
  }, 60_000);
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd bonti && pnpm test tests/integration/match-llm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement match-llm**

Create `bonti/src/lib/music-match/match-llm.ts`:

```ts
import { generateObject } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { MatchOutputSchema, type MatchOutput } from "./match-schema";
import { buildMatchPrompt } from "./match-prompt";
import type { NormalizedPlaylist } from "./spotify";
import type { Lang } from "@/types/chat";

export async function matchToLineup(input: {
  lang: Lang;
  normalized: NormalizedPlaylist;
}): Promise<MatchOutput> {
  const prompt = buildMatchPrompt(input);
  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { object } = await generateObject({
        model,
        schema: MatchOutputSchema,
        prompt,
        temperature: 0.4,
      });
      return object;
    } catch (e) {
      lastErr = e;
      console.warn(`[match-llm] ${label} failed:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error("All match-LLM candidates failed");
}
```

- [ ] **Step 4: Run the test against real OpenRouter**

Run: `cd bonti && pnpm test tests/integration/match-llm.test.ts`
Expected: PASS within 60s.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/lib/music-match/match-llm.ts tests/integration/match-llm.test.ts
git commit -m "feat(match): structured-output LLM call with fallback chain"
```

---

### Task 7: URL hashing + Supabase cache helpers

**Files:**
- Create: `bonti/src/lib/music-match/cache.ts`
- Create: `bonti/tests/unit/cache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `bonti/tests/unit/cache.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hashUrl } from "@/lib/music-match/cache";

describe("hashUrl", () => {
  it("is deterministic", () => {
    expect(hashUrl("x")).toBe(hashUrl("x"));
  });

  it("normalizes whitespace and trailing slashes", () => {
    expect(hashUrl("  https://example.com/x  ")).toBe(hashUrl("https://example.com/x/"));
  });

  it("differs across inputs", () => {
    expect(hashUrl("a")).not.toBe(hashUrl("b"));
  });

  it("returns a 64-char hex string", () => {
    expect(hashUrl("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd bonti && pnpm test tests/unit/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `bonti/src/lib/music-match/cache.ts`:

```ts
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchOutput } from "./match-schema";
import type { NormalizedPlaylist } from "./spotify";

export function hashUrl(input: string): string {
  const normalized = input.trim().replace(/\/+$/, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedMatch(
  supabase: SupabaseClient,
  urlHash: string,
): Promise<MatchOutput | null> {
  const { data, error } = await supabase
    .from("music_matches")
    .select("output")
    .eq("url_hash", urlHash)
    .maybeSingle();
  if (error || !data) return null;
  return data.output as MatchOutput;
}

export async function saveMatch(
  supabase: SupabaseClient,
  args: {
    urlHash: string;
    source: "spotify_url" | "ytmusic_url" | "apple_url" | "freeform";
    input: NormalizedPlaylist;
    output: MatchOutput;
  },
): Promise<void> {
  const { error } = await supabase.from("music_matches").upsert(
    {
      url_hash: args.urlHash,
      source: args.source,
      input: args.input,
      output: args.output,
    },
    { onConflict: "url_hash" },
  );
  if (error) throw error;
}
```

- [ ] **Step 4: Verify**

Run: `cd bonti && pnpm test tests/unit/cache.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/lib/music-match/cache.ts tests/unit/cache.test.ts
git commit -m "feat(match): url hashing + supabase cache helpers"
```

---

### Task 8: POST /api/match route

**Files:**
- Create: `bonti/src/app/api/match/route.ts`
- Create: `bonti/tests/integration/match-route.test.ts`

- [ ] **Step 1: Write a failing integration test**

Create `bonti/tests/integration/match-route.test.ts`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/match/route";

function req(body: object) {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/match", () => {
  it("rejects empty body with 400", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns a structured match for freeform input", async () => {
    const res = await POST(req({ freeform: "Tame Impala, Fred again.., LP", lang: "en" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.picks.length).toBeGreaterThan(0);
    expect(json.intro.length).toBeGreaterThan(0);
  }, 60_000);
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd bonti && pnpm test tests/integration/match-route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

Create `bonti/src/app/api/match/route.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { detectSource, extractSpotifyPlaylistId } from "@/lib/music-match/url-detect";
import { fetchSpotifyPlaylist, type NormalizedPlaylist } from "@/lib/music-match/spotify";
import { parseFreeform } from "@/lib/music-match/freeform";
import { matchToLineup } from "@/lib/music-match/match-llm";
import { hashUrl, getCachedMatch, saveMatch } from "@/lib/music-match/cache";
import type { Lang } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { url?: string; freeform?: string; lang?: Lang };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const lang: Lang = body.lang ?? "en";
  const supabase = createAdminClient();

  let source: "spotify_url" | "ytmusic_url" | "apple_url" | "freeform";
  let normalized: NormalizedPlaylist;
  let cacheKey: string;

  if (body.url && body.url.trim()) {
    const detected = detectSource(body.url);
    if (!detected) {
      return Response.json({ error: "unsupported_url", message: "Paste a Spotify, YT Music or Apple Music playlist URL — or use the freeform option." }, { status: 400 });
    }
    if (detected !== "spotify_url") {
      return Response.json({ error: "source_not_yet_supported", message: `${detected} parsing lands in a later plan; use freeform for now.` }, { status: 501 });
    }
    const id = extractSpotifyPlaylistId(body.url);
    if (!id) return Response.json({ error: "invalid_spotify_url" }, { status: 400 });

    cacheKey = hashUrl(`spotify:${id}`);
    const cached = await getCachedMatch(supabase, cacheKey);
    if (cached) return Response.json(cached);

    try {
      normalized = await fetchSpotifyPlaylist(id);
    } catch (e) {
      return Response.json(
        { error: "spotify_fetch_failed", message: (e as Error).message },
        { status: 502 },
      );
    }
    source = "spotify_url";
  } else if (body.freeform && body.freeform.trim()) {
    normalized = parseFreeform(body.freeform);
    if (normalized.artists.length === 0) {
      return Response.json({ error: "empty_freeform" }, { status: 400 });
    }
    cacheKey = hashUrl(`freeform:${lang}:${normalized.artists.map((a) => a.name).join("|")}`);
    const cached = await getCachedMatch(supabase, cacheKey);
    if (cached) return Response.json(cached);
    source = "freeform";
  } else {
    return Response.json({ error: "missing_input", message: "Provide url or freeform." }, { status: 400 });
  }

  const output = await matchToLineup({ lang, normalized });
  await saveMatch(supabase, { urlHash: cacheKey, source, input: normalized, output });
  return Response.json(output);
}
```

- [ ] **Step 4: Verify**

Run: `cd bonti && pnpm test tests/integration/match-route.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
cd bonti
git add src/app/api/match/route.ts tests/integration/match-route.test.ts
git commit -m "feat(match): POST /api/match with cache + spotify + freeform paths"
```

---

### Task 9: Match form component (URL + freeform toggle)

**Files:**
- Create: `bonti/src/components/match-form.tsx`

- [ ] **Step 1: Implement**

Create `bonti/src/components/match-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { MatchOutput } from "@/lib/music-match/match-schema";
import type { Lang } from "@/types/chat";

type Props = {
  lang: Lang;
  onResult: (result: MatchOutput) => void;
  onLoadingChange: (loading: boolean) => void;
};

const COPY = {
  en: {
    urlLabel: "Paste a public Spotify playlist URL",
    urlPlaceholder: "https://open.spotify.com/playlist/…",
    freeformToggle: "or paste a list of artists",
    freeformPlaceholder: "Glass Animals, Tame Impala, LP, Fred again..",
    submit: "Match my music",
    submitting: "Listening…",
  },
  ro: {
    urlLabel: "Paste link-ul unui playlist Spotify public",
    urlPlaceholder: "https://open.spotify.com/playlist/…",
    freeformToggle: "sau scrie o listă de artiști",
    freeformPlaceholder: "Glass Animals, Tame Impala, LP, Fred again..",
    submit: "Match-uiește muzica",
    submitting: "Ascult…",
  },
} as const;

export function MatchForm({ lang, onResult, onLoadingChange }: Props) {
  const [mode, setMode] = useState<"url" | "freeform">("url");
  const [url, setUrl] = useState("");
  const [freeform, setFreeform] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = COPY[lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    onLoadingChange(true);
    try {
      const body = mode === "url" ? { url, lang } : { freeform, lang };
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`);
      }
      onResult((await res.json()) as MatchOutput);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      onLoadingChange(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 w-full">
      {mode === "url" ? (
        <label className="block">
          <span className="block text-sm font-medium mb-1 text-bonti-ink">{c.urlLabel}</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={c.urlPlaceholder}
            className="w-full rounded-md border px-3 py-2 bg-white"
            required
          />
        </label>
      ) : (
        <label className="block">
          <span className="block text-sm font-medium mb-1 text-bonti-ink">{c.freeformToggle}</span>
          <textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder={c.freeformPlaceholder}
            rows={4}
            className="w-full rounded-md border px-3 py-2 bg-white"
            required
          />
        </label>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode(mode === "url" ? "freeform" : "url")}
          className="text-sm underline text-bonti-ink/70"
        >
          {mode === "url" ? c.freeformToggle : c.urlLabel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-bonti-red text-white px-4 py-2 disabled:opacity-50"
        >
          {submitting ? c.submitting : c.submit}
        </button>
      </div>

      {error ? <p className="text-sm text-bonti-red">{error}</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd bonti && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd bonti
git add src/components/match-form.tsx
git commit -m "feat(match): match form with URL/freeform toggle and EN/RO copy"
```

---

### Task 10: Match results card

**Files:**
- Create: `bonti/src/components/match-card.tsx`

- [ ] **Step 1: Implement**

Create `bonti/src/components/match-card.tsx`:

```tsx
import type { MatchOutput } from "@/lib/music-match/match-schema";

type Props = { result: MatchOutput };

export function MatchCard({ result }: Props) {
  return (
    <article className="rounded-lg border bg-white p-4 sm:p-6 space-y-5">
      <p className="text-lg leading-snug text-bonti-ink">{result.intro}</p>

      {result.picks.length > 0 && (
        <ul className="space-y-3">
          {result.picks.map((p, i) => (
            <li key={`pick-${i}`} className="flex items-start gap-3">
              <span aria-hidden className="mt-1">🟢</span>
              <div className="flex-1">
                <p className="font-medium text-bonti-ink">
                  {p.artist} — {p.day}, {p.stage}
                </p>
                <p className="text-sm text-bonti-ink/80">{p.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.skips.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-bonti-ink/60 mb-2">Skip</p>
          <ul className="space-y-2">
            {result.skips.map((s, i) => (
              <li key={`skip-${i}`} className="flex items-start gap-3">
                <span aria-hidden className="mt-1">🔴</span>
                <div className="flex-1">
                  <p className="font-medium text-bonti-ink">{s.artist}</p>
                  <p className="text-sm text-bonti-ink/80">{s.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd bonti && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd bonti
git add src/components/match-card.tsx
git commit -m "feat(match): match results card (picks + skips)"
```

---

### Task 11: /match page + header link

**Files:**
- Create: `bonti/src/app/match/page.tsx`
- Modify: `bonti/src/components/bonti-header.tsx`

- [ ] **Step 1: Build the page**

Create `bonti/src/app/match/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BontiHeader } from "@/components/bonti-header";
import { MatchForm } from "@/components/match-form";
import { MatchCard } from "@/components/match-card";
import type { MatchOutput } from "@/lib/music-match/match-schema";
import type { Lang } from "@/types/chat";

export default function MatchPage() {
  const [lang] = useState<Lang>("en");
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-bonti-bg flex flex-col">
      <BontiHeader user={null} />
      <section className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-bonti-ink">Match your music to EC12</h1>
          <p className="text-sm text-bonti-ink/70">
            Paste a playlist. Bonți tells you what's yours at the festival.
          </p>
        </header>
        <MatchForm lang={lang} onResult={setResult} onLoadingChange={setLoading} />
        {loading ? (
          <p className="text-sm text-bonti-ink/60">Bonți is listening…</p>
        ) : result ? (
          <MatchCard result={result} />
        ) : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add header link**

Read `bonti/src/components/bonti-header.tsx`, then add a `<Link href="/match">Match</Link>` (using Next's `Link` from `next/link`) in the header nav next to whatever exists. Keep existing structure.

- [ ] **Step 3: Local smoke test**

Run: `cd bonti && pnpm dev`
Open `http://localhost:3000/match`, paste `Glass Animals, Fred again.., LP` into freeform, submit, confirm a card renders within 30 seconds.
Stop the dev server (`Ctrl-C`).

- [ ] **Step 4: Commit**

```bash
cd bonti
git add src/app/match/page.tsx src/components/bonti-header.tsx
git commit -m "feat(match): /match page + header link"
```

---

### Task 12: Production verification

- [ ] **Step 1: Deploy**

Run: `cd bonti && git push origin main`
Expected: Vercel auto-deploys main to `bonti-ten.vercel.app`. Wait for deploy to finish.

- [ ] **Step 2: Verify Spotify env on Vercel (only if user has filled keys)**

If `.env.local` has real `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`, push them to Vercel production envs (skip if keys are blank — freeform path is enough for the demo). Use the Vercel CLI or the dashboard.

- [ ] **Step 3: E2E on production**

Run:
```bash
curl -s -X POST https://bonti-ten.vercel.app/api/match \
  -H 'content-type: application/json' \
  -d '{"freeform":"Glass Animals, Tame Impala, Fred again.., LP","lang":"en"}' | head -c 500
```
Expected: a JSON object containing `intro`, `picks` (>0 entries), `skips`.

- [ ] **Step 4: Browser smoke**

Open `https://bonti-ten.vercel.app/match` and paste the same freeform input via the UI. Confirm a card renders within 30 seconds.

- [ ] **Step 5: Final commit if anything tweaked**

```bash
cd bonti
git status                      # confirm clean if no changes were needed
```

---

## Self-review

**Spec coverage:**
- Music match via playlist URL paste — Tasks 2, 3, 8 (Spotify URL detect, fetch, route)
- UX safety net (freeform fallback) — Tasks 4, 8 (freeform parser + route branch)
- Romanian + English support — Tasks 5, 9 (prompt accepts `lang`; form copy table)
- Caches per URL hash — Task 7 + Task 8 cache lookup
- Bonți voice in results — Task 5 (reuses `VOICE_RULES` from foundation)
- Structured output via zod — Tasks 5, 6 (`MatchOutputSchema`, `generateObject`)
- Demo unbreakability — freeform path requires zero external creds

**Out of scope for this plan (tracked for future plans):**
- YT Music + Apple Music URL parsing (returns 501 today, deferred)
- Plan card / group convince / ticket CTA (next plan)
- Inline `<match/>` token rendering inside `/chat` (will plug `MatchCard` into chat in a later plan)

**Placeholder scan:** None. All file paths absolute; all code blocks complete; commit messages explicit.

**Type consistency:**
- `NormalizedPlaylist` defined once in `spotify.ts`, imported by `freeform.ts`, `match-prompt.ts`, `match-llm.ts`, `cache.ts`, `route.ts`. ✅
- `MatchOutput` defined once in `match-schema.ts`, imported by `match-llm.ts`, `cache.ts`, `match-card.tsx`, `match-form.tsx`. ✅
- `Lang` reused from `@/types/chat`. ✅
