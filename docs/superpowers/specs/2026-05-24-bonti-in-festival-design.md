# Bonți — In-Festival Surface (Plan 2)

> Design spec for the post-ticket in-festival experience: the surfaces under `/app/*` that judges will see in Acts 5–6 of the demo. Plan 2 builds the entire in-festival side of Bonți: home, compass, group meet-up, notifications, lineup with music-match overlay, and wait times.
>
> **Design date:** 2026-05-24. **Festival:** 16–19 July 2026 (EC12), Bonțida, Cluj, RO. **Presentation:** 2026-05-22 (already past — this is the post-presentation iteration).
>
> **Parent spec:** `docs/superpowers/specs/2026-05-23-bonti-electric-castle-design.md` — §5 (information architecture) and §6 (feature catalog) define the in-festival surfaces at a high level. This document refines that into a buildable plan.
>
> **Status of prior plans:**
> - Plan 0 (foundation) — shipped: chat at `/`, Supabase auth, retrieval pipeline, brand tokens
> - Plan 0.5 (Cohere swap + adaptive RAG) — shipped
> - Plan 1 (music match) — shipped: `/match` route, lineup data, full LLM match pipeline (freeform path live; Spotify URL path blocked on Premium credentials)
> - **Plan 2 (this doc) — in-festival surface**
> - Plan 3 (admin CMS + broadcasts + insights) — not yet specced

---

## 1. Goal & non-goals

**Goal.** Build the six surfaces under `/app/*` that deliver Act 5 (in-festival magic) and stage the render path for Act 6 (the Justin Timberlake broadcast moment, which Plan 3 will fire live). All surfaces must work standalone in a 4-minute demo without backstage controls, manual triggers, or wizard-of-oz fakery — the surfaces themselves are the demo.

**Non-goals.**
- No iPhone frame, fake status bar, or fake hardware chrome. Judges hold real phones; we don't draw bezels around a web app.
- No demo control panel. State is pre-seeded to one moment (21:43 Saturday) and stays there.
- No new Supabase tables beyond what Plan 0/1 already created. Festival state lives client-side.
- No real GPS, no real maps. Stylized SVG of the venue with hand-positioned points.
- No `/admin/*` surfaces — those are Plan 3.

## 2. Brand amendment: Bonți's face is the EC duck

The master design spec (§3) currently says Bonți's avatar is *"EC's red ticket logo with cartoon eyes."* Plan 2 supersedes this: **Bonți's avatar is a rubber duck**, modeled on the giant inflatable yellow duck that has appeared at EC in past editions. The duck is already mascot-coded at the festival, judges who've been to EC will recognize it instantly, and it carries personality (cartoon eyes, orange bill) without us designing any.

**Implementation:**
- Source a free animated rubber-duck Lottie from LottieFiles (idle bob + occasional blink). Fallback: a hand-drawn SVG matching the giant duck's silhouette — yellow body, orange bill, big black-pupil cartoon eyes.
- Asset path: `bonti/public/bonti-duck.json` (Lottie) or `bonti/public/bonti-duck.svg`.
- One component: `<BontiAvatar size="sm|md|lg|xl" animated={true} />`.
- Appears in: app header (left of the wordmark), chat bubbles, match cards, notification rows, favicon (cropped duck head 32×32).
- Animation policy: subtle 2s idle bob, occasional blink, stops when `prefers-reduced-motion` is set. No squash/stretch — the duck is calm.

**Back-port to master spec:** when Plan 2 ships, update `2026-05-23-bonti-electric-castle-design.md` §3 to reflect the duck.

## 3. Architecture & scope

### 3.1 Reused (no new code)

- `<ChatShell />`, `useChat`, `/api/chat` — extended with a `mode: "in_festival"` param so Bonți's system prompt anchors to "you're on-site at Bonțida, 21:43 Saturday, the user has 3 friends nearby"
- Brand tokens (`bonti-bg`, `bonti-toolbar`, `bonti-red`, `bonti-text`, `bonti-surface`, fonts) — already in Tailwind v4 `@theme`
- Music-match data — `/app/lineup` reads from `music_matches` Supabase table for the current session/user
- Supabase server/client/admin — `src/lib/supabase/*`
- OpenRouter free-model loop + buffered `generateText` + JSON-extract pattern from `src/lib/music-match/match-llm.ts` — every new LLM route mirrors this pattern

### 3.2 New code

**Layout & chrome:**
- `bonti/src/app/app/layout.tsx` — mobile-first shell wrapping all `/app/*` children
- `bonti/src/components/app-header.tsx` — full-bleed header strip (duck avatar left, page title center, bell/back right) using `bonti-toolbar` and respecting `env(safe-area-inset-top)`
- `bonti/src/components/app-tabbar.tsx` — bottom tab bar (5 tabs: Home, Compass, Group, Lineup, Pings) respecting `env(safe-area-inset-bottom)`
- `bonti/src/components/bonti-avatar.tsx` — duck avatar component (Lottie or SVG)
- `bonti/src/components/bonti-chat-fab.tsx` — floating action button (round, duck-head) on subpages that opens a half-sheet chat overlay

**Surfaces:**
- `bonti/src/app/app/page.tsx` — Home
- `bonti/src/app/app/compass/page.tsx` — Smart compass
- `bonti/src/app/app/group/page.tsx` — Group meet-up
- `bonti/src/app/app/notifications/page.tsx` — Ping feed
- `bonti/src/app/app/lineup/page.tsx` — Schedule with music-match overlay
- `bonti/src/app/app/wait-times/page.tsx` — Mocked crowd density

**Shared components:**
- `bonti/src/components/venue-map.tsx` — stylized SVG of EC grounds with overlay pins (used by `/app/group`, optionally in compass result drill-down)
- `bonti/src/components/compass-card.tsx` — arrow + distance + walk time + Bonți copy
- `bonti/src/components/ping-row.tsx` — single notification row (duck avatar, title, body, timestamp, deeplink)
- `bonti/src/components/ping-toast.tsx` — slide-in-from-top toast for fresh pings
- `bonti/src/components/lineup-row.tsx` — single artist row with green/red overlay pill
- `bonti/src/components/density-bar.tsx` — horizontal density meter for wait times

**Data:**
- `bonti/src/data/venue.ts` — venue catalog (stages, food, beer, bathrooms, etc.) with SVG coordinates, line probabilities, queue states, Bonți blurbs
- `bonti/src/data/festival-state.ts` — seeded Maria + 3 friends, `DEMO_NOW`, seeded pings, seeded broadcasts

**Library:**
- `bonti/src/lib/festival/store.ts` — Zustand store for session-bound festival state (positions, ping read-state, group meeting, etc.) with cookie persistence
- `bonti/src/lib/festival/compass.ts` — venue catalog formatting + bearing/distance math
- `bonti/src/lib/festival/converge.ts` — friend-positions formatting + animation helpers
- `bonti/src/lib/festival/prompts.ts` — system prompts for in-festival mode, compass, converge, lineup-blurb

**API routes:**
- `bonti/src/app/api/compass/route.ts` — POST: NL query → `{target_id, reason, line_state}`
- `bonti/src/app/api/group/converge/route.ts` — POST: 4 positions + time → `{meeting_point_id, eta_min, reason, en, ro}`
- `bonti/src/app/api/lineup/blurb/route.ts` — POST: artist name + lang → one-sentence Bonți blurb, cached
- `bonti/src/app/api/chat/route.ts` — modify existing: accept optional `mode: "in_festival"` and swap system prompt accordingly

**PWA:**
- `bonti/public/manifest.json` — name "Bonți", duck icon set, theme color `#EB0000`, standalone display mode
- `bonti/src/app/layout.tsx` — add `<link rel="manifest" />`, `apple-touch-icon`, `<meta name="viewport" content="viewport-fit=cover" />`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`

### 3.3 Auth posture

`/app/*` is accessible without sign-in. On first visit to `/app`, a `bonti_session` cookie (UUID, 30-day TTL) is set if absent. The same cookie also keys `music_matches.session_id`, so a session that did `/match` on the pre-ticket side sees its picks reflected in `/app/lineup`. Google sign-in is still available via the existing header; when signed in, the store also gets `user_id` and `music_matches` queries prefer it over `session_id`. Sign-in never blocks any surface.

### 3.4 Mobile shell

`/app/*` is a mobile-first PWA. Designed for a single column ≤ 480px wide. Above 480px (desktop fallback), the column is centered on a soft `bonti-bg` backdrop — no hardware bezel, just a clean column. Honest, demoable from a laptop.

**Header strip** — sticky top of every `/app/*` page, full-bleed `bg-bonti-toolbar`, ~52px content height + safe-area top padding so a notch/dynamic island sits on top of the strip rather than over content.
- Left: `<BontiAvatar size="sm" animated />` — tappable, returns to `/app`
- Center: page title in Sofia Bold uppercase
- Right: bell icon with unread dot on home; back-chevron on subpages

**Tab bar** — sticky bottom of every `/app/*` page, ~56px + safe-area bottom padding.
- Tabs: 🏰 Home · 🧭 Compass · 👥 Group · 🎤 Lineup · 🔔 Pings
- Active tab uses `bonti-red`; inactive uses `bonti-text/60`
- Wait times is reachable from a tile on Home (not a primary tab — 5 tabs is the comfort ceiling)

**Chat affordance** — on `/app` Home, the chat is part of the page. On every subpage, a floating duck-head action button sits above the tab bar (bottom-right). Tapping it slides up a half-sheet chat overlay (Framer Motion); page dims underneath.

**Visual posture** — same warm `bonti-bg` as pre-ticket. No drop shadows for hardware (we have none). Card surfaces with sharp 12px corners. Content-level shadows only.

## 4. Per-surface design

### 4.1 `/app` — Home

Hero card at the top driven by seeded festival state: current time (21:43 Saturday from `DEMO_NOW`), Maria's next music-match pick if any, otherwise a Bonți prompt (*"Tell me what you want and I'll point you there."*). Below the hero: the chat (existing `<ChatShell />` styled for narrow mobile, with `mode: "in_festival"` so Bonți's system prompt anchors to the festival now). Below the chat: a 2-column grid of large tappable tiles — Compass, Group, Lineup, Pings, Wait times, Plan. Footer: a thin "live ticker" strip rendering the most-recent seeded broadcast (*"Booha set running 10 min late"*); same component will read Supabase Realtime in Plan 3 without changes.

**Reads:** `festival-state.ts`, `music_matches` table (latest row for current session/user), `lineup.ts` (to resolve the "next pick").
**LLM:** via existing `/api/chat` with `mode: "in_festival"`.

### 4.2 `/app/compass`

Text input at the top: *"Where to?"* + four suggestion chips below (🍺 Beer · 🚻 Bathroom · 🍕 Food · 🌿 Quiet). User types or taps a chip. `/api/compass` POSTs `{query, lang, position}`; LLM receives the venue catalog from `venue.ts` and returns `{target_id, reason, line_state}`. We resolve `target_id` against `venue.ts` to get coordinates, then render a `<CompassCard />`: stylized arrow (rotated to a hand-computed bearing from Maria's seeded coords), distance ("80m"), walk time ("~1 min"), line state ("Line is short" — LLM-inferred), and one Bonți-voice sentence (*"Beer Garden, 80m dreapta. Line is short."*). Below the card: a "Why this one?" disclosure showing the LLM's `reason` (transparent, not a black box). Tap the arrow → bottom-half sheet expands the venue SVG with the route drawn from Maria to the target.

**Reads:** `venue.ts`, `festival-state.ts`.
**LLM:** new `/api/compass` route, JSON via `generateText` + extract.
**Caching:** results memoized in the Zustand store keyed by `normalized_query`.
**Mocked:** `line_state` is LLM-inferred from `lineProbability` field hand-seeded per venue point. No real queue data.

### 4.3 `/app/group`

Stylized SVG of EC grounds fills most of the screen — stages, beer gardens, food, beach, campsite blocks, EC Village all named. Four small circular avatars (Maria + Alex + Ioana + Andrei — pre-seeded) positioned around the map: one at Booha, one at Main, one at food court, Maria at the beer garden. Tap any avatar → small popover (name, last seen, last activity). Top of screen: status strip — *"👥 Group of 4 · spread across 200m."* Bottom of screen: one large CTA button *"Let's meet up"* → fires `/api/group/converge` with the 4 positions and current `DEMO_NOW`. LLM returns `{meeting_point_id, eta_min, reason, en, ro}`. All 4 avatars then animate (Framer Motion springy easing, ~3s) along straight lines toward the meeting point. ETA badge pops: *"Group ETA 8 min · Banffy puts everyone within 5 min walk."* Bonți-voice copy underneath in the user's language.

**Reads:** `festival-state.ts`, `venue.ts`.
**LLM:** new `/api/group/converge` route.
**State mutation:** updated friend positions persist to the Zustand store + cookie so a refresh during demo doesn't reset.

### 4.4 `/app/notifications`

Vertical feed of `<PingRow />` components. Each row: duck avatar (left, 36px), title + body (center), timestamp + tap-target (right). Four pings pre-seeded in `festival-state.ts.SEEDED_PINGS`, all dated earlier in the evening (between 19:45 and 21:15, so they're already in the feed when the surface opens at the seeded `DEMO_NOW`):

1. **21:15** — *Beach Stage is empty right now. 4 min walk. Beer and sand.* → `/app/compass?target=beach_stage`
2. **20:50** — *Alex pinged you "where r u".* → `/app/group`
3. **20:30** — *Booha set running 10 min late.* → `/app/lineup`
4. **19:45** — *⚡ Drumul înapoi e plin după Timberlake. Shuttle-ul revine la 3. Stai la festival.* → `/app/notifications` (the Act 6 broadcast pre-seeded so the surface looks lived-in even before Plan 3 wires Realtime)

Top of screen: *"4 today"* (count is dynamic — grows as new pings arrive) + a *"Mark all read"* affordance.

**Live moment:** a single `setTimeout` 8s after `/app` first mounts appends a **fresh** ping with `fires_at = DEMO_NOW + 8s` — *"Glass Animals in 10 min at Main. Your match."* — to the store, triggers a `<PingToast />` slide-in, increments the bell badge. Story-justified by the seeded time: Glass Animals starts at ~21:50; user opens the app at 21:43; the 10-min warning arrives naturally seconds after they look around. No human in the loop, no demo button. After the toast dismisses, the ping joins the notification feed as item zero. Distinct from the four seeded pings above — those represent earlier-arrived items; this is the live arrival.

**Reads:** `festival-state.ts.SEEDED_PINGS`, Zustand store for read-state.
**LLM:** none.
**Plan 3 handoff:** when broadcasts arrive via Supabase Realtime, the store appends them to the same `pings` array and the toast/feed renders them via the same components.

### 4.5 `/app/lineup`

Tab strip at top: FRI · SAT · SUN (sticky). Default to SAT (matches seeded `DEMO_NOW`). Below: vertical list of artist rows grouped by stage (Main → Hangar → Booha → Beach). Each `<LineupRow />`: artist name (Sofia Bold uppercase), time + stage, one-line description from `lineup.ts.ec_tags`. Overlay state: green pill *"🟢 Your match"* on rows where the artist appears in the user's `music_matches.output.picks`; red pill *"🔴 Skip"* if in `skips`. If no music match exists yet, rows are plain and a banner sits above the list: *"Match your music to get green/red on these rows. →"* linking to `/match`. Tap any artist → slide-up sheet with EC tags, a *"Show on compass"* CTA, and a Bonți-voiced sentence about the artist (LLM-generated on first tap, cached server-side keyed by `(artist_name, lang)` so repeat taps don't burn calls).

**Reads:** `lineup.ts`, `music_matches` table.
**LLM:** new `/api/lineup/blurb` route, server-cached.
**Schema:** no new tables. Cache lives in a small new table `artist_blurbs (artist_name, lang, blurb, created_at)` or piggybacks on the existing `music_matches` payload — pick whichever is cleaner at build time.

### 4.6 `/app/wait-times`

Reachable from the Home tile (not in the primary tab bar). Vertical list: each row is a location with a horizontal `<DensityBar />` (green/yellow/red) + a numeric estimate (*"~3 min wait"* / *"Heavy crowd"*). Locations come from `venue.ts` (only points where `queueState` is set — beer gardens, food trucks, bathrooms, main-stage front-pit). Sortable: *"By wait"* / *"By distance from me."* No LLM — pure data render. Refresh button at top shows a 1.5s skeleton then re-reads the same seeded data (gives the feel of live updates without lying about realtime).

**Reads:** `venue.ts` (extended with `queueState` per location).
**LLM:** none.

## 5. Data & state model

### 5.1 `bonti/src/data/venue.ts`

```ts
export type VenueKind =
  | "stage" | "beer" | "food" | "bathroom"
  | "beach" | "campsite" | "village" | "shuttle" | "first_aid";

export type VenuePoint = {
  id: string;                      // "main_stage", "beer_garden_n", ...
  name: string;                    // "Main Stage" / "Beer Garden North"
  kind: VenueKind;
  coords: { x: number; y: number }; // SVG viewBox coords (0..1000)
  ec_tag?: string;                 // cross-ref with lineup.ts.ec_tags
  lineProbability?: "low" | "med" | "high";
  queueState?: { density: "low" | "med" | "high"; estimateMin: number };
  bonti_blurb?: string;            // one-line voiced description
};

export const VENUE: VenuePoint[] = [/* ~25-30 hand-seeded points */];
export const METERS_PER_UNIT = 0.4; // calibrate so Main↔Hangar ≈ 200m
```

Coordinates are SVG viewBox space, not lat/lng. The same SVG draws the map; pins position themselves by reading `coords`. Distances are Euclidean × `METERS_PER_UNIT`. Bearings are pure trigonometry. No haversine, no real geography.

### 5.2 `bonti/src/data/festival-state.ts`

```ts
export type Persona = {
  id: string;
  name: string;
  avatar_emoji: string;
  coords: { x: number; y: number };
  last_activity: string;           // "at Booha · 4 min ago"
};

export type SeededPing = {
  id: string;
  fires_at: string;                // ISO, all dated to demo evening
  lang: "ro" | "en";
  title: string;
  body: string;
  deeplink?: string;
};

export const DEMO_NOW = new Date("2026-07-18T21:43:00+03:00"); // Saturday EC

export const MARIA: Persona = { id: "maria", name: "Maria", /* ... */ };
export const FRIENDS: Persona[] = [
  { id: "alex", name: "Alex", /* ... */ },
  { id: "ioana", name: "Ioana", /* ... */ },
  { id: "andrei", name: "Andrei", /* ... */ },
];

export const SEEDED_PINGS: SeededPing[] = [/* 5 from §4.4 */];

export const SEEDED_BROADCASTS: { ts: string; en: string; ro: string }[] = [
  /* Act 6 Timberlake-shuttle line pre-loaded, plus 1-2 ambient lines */
];
```

### 5.3 `bonti/src/lib/festival/store.ts` — Zustand

```ts
type FestivalState = {
  maria: Persona;
  friends: Persona[];
  pings: (SeededPing & { read: boolean; received_at: string })[];
  group_meeting?: { point_id: string; eta_min: number; reason: string };

  // actions
  appendPing: (p: SeededPing) => void;        // also used by Plan 3 realtime hook
  applyGroupConverge: (result: GroupConvergeResult) => void;
  markAllPingsRead: () => void;
};
```

Seeded from `festival-state.ts` on first read. Persisted to a cookie (`bonti_festival_state`, 24h TTL) so a refresh during the demo doesn't reset positions or ping read-state.

### 5.4 Supabase

**Read-only from new code:**
- `music_matches` — by `/app/lineup` (overlay) and `/app` home (next-pick hero). Most recent row for current `session_id` or `user_id`. No new columns.

**Possible new table for artist-blurb cache:**
- `artist_blurbs (artist_name TEXT, lang TEXT, blurb TEXT, created_at TIMESTAMPTZ, PRIMARY KEY (artist_name, lang))`
- Alternative: piggyback on `music_matches.output` JSON. Choose at implementation time based on which is cleaner.

**Not added:**
- No `festival_sessions`, no `pings`, no `groups`. The original master spec (§8.3) sketched these for a real product; for this hackathon all such state lives in the client store + cookie.

### 5.5 Session identity

- `bonti_session` cookie (UUID, 30-day TTL) set on first visit to `/` or `/app`. Same cookie keys `music_matches.session_id`.
- If user is signed in, the store also gets `user_id`; queries prefer `user_id` over `session_id`. Existing Supabase auth flow unchanged.

## 6. LLM call surface

All new routes mirror `match-llm.ts`: buffered `generateText`, JSON extracted from text (markdown fence strip + outermost `{}` slice + `zod.parse`), candidate loop over `[BONTI_LLM, ...FALLBACK_MODELS]`, `maxRetries: 0` per call, 503 if all fail.

| Route | Purpose | Returns | Cached? |
|---|---|---|---|
| `/api/chat` (extended) | In-festival chat | Plain text | No |
| `/api/compass` | Resolve NL query → venue target | `{target_id, reason, line_state}` | Yes — Zustand store keyed by `normalized_query` |
| `/api/group/converge` | Pick meeting point from 4 positions | `{meeting_point_id, eta_min, reason, en, ro}` | No — every tap is a fresh moment |
| `/api/lineup/blurb` | One-sentence Bonți artist intro | Plain text | Yes — server-side per `(artist_name, lang)` |

**Worst-case LLM call count in a 4-min demo:** 1 chat reply + 1 compass + 1 group converge + 1 lineup artist sheet = 4 calls. Free-tier OpenRouter headroom is fine.

## 7. Demo orchestration

**There is no demo control panel. The surfaces themselves are the demo.**

- State is pre-seeded to one moment (21:43 Saturday) and stays there. Status bar reads 21:43. Hero card reflects 21:43. Friends are at their 21:43 positions.
- Four pings are pre-seeded with realistic earlier timestamps (19:45 through 21:15) — already there when the user opens `/app/notifications`.
- One live ping moment: 8s after `/app` first mounts, a fresh **Glass Animals — 10 min at Main** ping arrives as a slide-in toast (`fires_at = DEMO_NOW + 8s`). Story-justified by the seeded time (21:43 + 10-min warning for 21:50 Glass Animals set). No human in the loop, no demo button.
- Group converge fires when the presenter taps *"Let's meet up"* — same button judges would tap, same API call, same animation.
- Compass works when the presenter types or taps a chip. No pre-firing.
- Act 6 broadcast: ⚡ Timberlake-shuttle ping is already in the notification feed at 19:45. Plan 3 will fire a *fresh* one live via Supabase Realtime → same toast/notification components.

### 7.1 Presentation-day prep

- Run music match on `/match` on demo morning with a curated playlist that gives strong green/red signal on Glass Animals + Mochakk + LP. Cookie-bake the result.
- Sign in via Google before judges arrive so `music_matches` is keyed to a real `user_id`.
- Test the network path the demo will run on (venue Wi-Fi, hotspot, laptop tether). Pick one and stick with it.
- Pre-load each surface once in the demo browser session so the service worker caches everything.

### 7.2 Failure modes

| Failure | Behavior |
|---|---|
| LLM 503 from `/api/compass` or `/api/group/converge` | Surface shows an inline retry card (*"Bonți's thinking… try again?"*). No crash. The route already walked the fallback chain before returning 503. |
| Supabase down / no `music_matches` row | `/app/lineup` shows plain lineup with the *"Match your music"* banner. `/app` hero shows a generic Bonți prompt instead of personalized "next pick." |
| Free model returns garbage JSON | zod parse fails, route falls through to next candidate; 503 if all fail. Mirrors `match-llm.ts` exactly. |
| Cookie missing/cleared mid-demo | Store re-seeds from `festival-state.ts` on next page load. Loss is converge animation state + ping read-state — both recoverable by tapping the surface again. |
| Wi-Fi flaky | Service worker caches `/app/*` shell + venue SVG + duck Lottie on first visit. Surfaces render offline; LLM calls require network but each surface has a *"Bonți's thinking…"* state that doesn't break layout. |
| Total internet outage | Switch to pre-recorded screen capture (cut on demo morning, committed to repo, linked from a `/app/demo-video` route). Real backup, not a switchable demo mode. |

## 8. Plan 2 → Plan 3 handoff contract

Plan 3 builds the admin CMS, broadcasts, and insights dashboard. Plan 2 leaves it the following ready interfaces:

- **`SEEDED_BROADCASTS`** is the wire format Plan 3 must produce. Plan 3 inserts new rows into a Supabase `broadcasts` table; a Realtime subscription pushes them to the client store's `appendPing` action; the same `<PingToast />` and `<PingRow />` components render them.
- **No presenter-only code paths.** Plan 3 doesn't need to clean up any demo controls because there aren't any.
- **The `setTimeout` Glass Animals ping** in `/app` becomes a no-op or is removed entirely once Plan 3 is wired — the live broadcast pipeline owns ping delivery.
- **The `SEEDED_PINGS` array** continues to exist as a fallback for new visitors before any broadcasts have arrived (so the notification surface is never empty).

## 9. Voice & copy

All Bonți-voiced strings in Plan 2 follow the rules in `docs/research/ec-tone-of-voice.md` (40 verbatim quotes, 22 derived rules) and the system prompt in `src/lib/prompts/bonti-system.ts`. Key points:

- **Tu/voi in RO. Never dumneavoastră.**
- **Lead with image or fact, not greeting.** No *"Salut, frate!"* in any surface.
- **Brand tokens stay English mid-RO sentence.** *"line up-ul"*, *"shuttle-ul"*, *"match-ul"*, *"Banffy"*, *"EC Village"*.
- **Compass uses flat-informational register.** *"Beer Garden, 80m dreapta. Line is short."*
- **Notifications use ⚡ only for genuine urgency** (Timberlake-shuttle ping). Music-match pings have no decorative emoji.
- **UPPERCASE Sofia for headlines and short labels** (page titles, tab labels, "YOUR MATCH" pills). Sentence-case Roboto for body text.

## 10. Open questions / explicit deferrals

1. **Lineup data completeness.** The current `lineup.ts` was hand-curated for Plan 1 (music match). Plan 2 needs day/stage/time data for every artist for `/app/lineup` to render a credible schedule. If `lineup.ts` is incomplete, the Plan 2 implementation task list includes a "fill out lineup data" task — sourced from EC's official lineup announcement.
2. **Artist-blurb cache table vs JSON piggyback.** Implementer decides at build time. Either is fine.
3. **Wait-times sort persistence.** Currently designed as a transient toggle. If we want it to remember the user's last choice, add it to the Zustand store. Defer to implementation.
4. **PWA install prompt.** Out of scope for Plan 2. Manifest exists so "Add to Home Screen" works manually, but we don't prompt for it.
5. **Lottie license verification.** When sourcing the duck animation, verify CC0 or commercial-use-OK. Fallback SVG must be ready if no acceptable Lottie is found.
6. **Service worker scope.** Caching `/app/*` is in scope; pre-caching `/match` and `/` is nice-to-have. Defer to implementation if time-boxed.

## 11. References

- `docs/superpowers/specs/2026-05-23-bonti-electric-castle-design.md` — master design spec
- `docs/superpowers/plans/2026-05-23-bonti-foundation.md` — Plan 0 (shipped)
- `docs/superpowers/plans/2026-05-23-bonti-music-match.md` — Plan 1 (shipped)
- `docs/research/ec-tone-of-voice.md` — voice rules + verbatim quotes
- `bonti/src/lib/music-match/match-llm.ts` — canonical pattern for buffered LLM JSON calls
- `bonti/src/app/api/chat/route.ts` — canonical pattern for buffered LLM text calls with fallback chain
- LottieFiles — source for duck animation: `lottiefiles.com`
- EC duck mascot reference photo (provided by user in Plan 2 brainstorm, 2026-05-23)
