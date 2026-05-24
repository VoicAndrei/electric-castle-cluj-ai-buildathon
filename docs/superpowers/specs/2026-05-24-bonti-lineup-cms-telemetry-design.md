# Bonți Plan 3b — Lineup CMS + Telemetry Design

**Status:** Spec approved, ready for plan writing
**Date:** 2026-05-24
**Author:** Andrei Voic (RebelDot) + Claude
**Successor to:** Plan 3a (Live Broadcasts — shipped, commits `2c21752` → `4d6d4c2`)
**Predecessor to:** Plan 3c (Insights Dashboard — not yet specced)

---

## 1. Goal

Two things ship together in Plan 3b:

1. **Telemetry plumbing (3b-1)** — every meaningful action on every Bonți surface writes a typed event to `public.events`. Read by the future 3c insights dashboard. Must never block or break UX.
2. **Lineup CMS (3b-2)** — EC ops can edit the festival lineup (artists, stages, set times) through an `/admin/lineup` surface. Edits propagate to `/app/lineup` in ~1s via Supabase realtime. The static `docs/ingest/lineup.json` becomes the seed, not the source of truth.

**Pilot story:** "EC runs the content. Engineering is off the critical path. And we already know what's working — every interaction is logged." This is the "shippable on EC's stack next month" beat the brief asks for.

---

## 2. Architecture

### Telemetry (3b-1)

**Hybrid emit strategy** — server-side from existing API routes, client-side via a thin `/api/events` POST for pure-client signals.

- Shared helper `logEvent(type, payload, sessionId?)` writes to `public.events` via service-role
- Server: `/api/compass`, `/api/group/converge`, `/api/lineup/blurb`, `/api/chat`, `/api/match`, `/api/admin/broadcasts` all gain a `void logEvent(...)` after their success path
- Client: `/api/events` POST + `useEventLogger()` hook for ping-shown, ping-tapped, lineup-view, artist-blurb-view, wait-times-view
- Anonymous `bonti-session-id` cookie (uuid, 30-day TTL, httpOnly) groups events for a visitor without requiring login

Fire-and-forget at every layer. Telemetry failures `console.error` but never throw to the caller.

### Lineup CMS (3b-2)

**Single table `lineup_entries`** (flat, matches the shape of `lineup.json`), seeded from the static JSON via a migration. Set times (`start_at`/`end_at`) are nullable — admins fill them during the buildathon.

`/admin/lineup` is a CRUD surface under the existing Plan-3a admin shell. Edits hit `/api/admin/lineup*` routes (admin-gated, service-role writes, RLS bypass intentional). `/app/lineup` flips from reading the static `LINEUP` constant to a server-side `loadLineup()` that reads the DB and falls back to the JSON only on DB unavailability.

**Realtime live-edit moment:** `useLineupRealtime` on `/app/lineup` subscribes to `lineup_entries` INSERT/UPDATE/DELETE → edits propagate within 1s with a brief yellow shimmer on the affected row. This is the demo win.

### Trade-offs rejected

- **Separate `artists` + `set_times` tables.** Cleaner relationally but the source JSON is flat and we have no multi-stage artists. Single table = less migration churn. Re-normalize later if needed.
- **Client-side analytics SDK (Plausible / PostHog).** Hosting cost, GDPR cookie banner surface, server reach is awkward. We own the questions; rolling our own is ~30 lines of helper + a route.

---

## 3. Data model + migrations

### Migration `20260526000000_lineup_entries.sql`

```sql
create table public.lineup_entries (
  id          uuid primary key default gen_random_uuid(),
  artist_name text not null,
  day         text not null check (day in ('Friday','Saturday','Sunday')),
  stage       text not null,
  start_at    timestamptz null,
  end_at      timestamptz null,
  ec_tags     text[] not null default '{}',
  genres      text[] not null default '{}',
  photo_url   text null,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

create unique index lineup_entries_artist_day_stage_uniq
  on public.lineup_entries (artist_name, day, stage);

create index lineup_entries_day_sort_idx
  on public.lineup_entries (day, sort_order);

alter table public.lineup_entries enable row level security;

create policy lineup_entries_public_read
  on public.lineup_entries for select
  using (true);

-- No anon write policy. Service-role writes only (admin API routes).

create function public.touch_lineup_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lineup_entries_touch_updated_at
  before update on public.lineup_entries
  for each row execute function public.touch_lineup_entries_updated_at();

alter publication supabase_realtime add table public.lineup_entries;
```

### Migration `20260526000100_seed_lineup_entries.sql`

Generated from `docs/ingest/lineup.json` (24 rows). `start_at`/`end_at` left NULL initially. `sort_order` = 10, 20, 30… per day to allow admin insertion between rows.

The plan-task will include a TypeScript generator that reads the JSON and emits the migration body — keeps the seeded values authoritative against the source data.

### Migration `20260526000200_events_payload_gin.sql`

```sql
create index events_payload_gin_idx
  on public.events using gin (payload);
```

The foundation already created `(type, payload, session_id, created_at)` columns and `events_type_idx` / `events_created_idx`. We add a GIN index over `payload` for future filtering on session_id / artist_name / broadcast_id keys.

**Naming check:** `20260526_*` sorts cleanly after Plan 3a's `20260525_*` siblings — no partial-prefix collision (see `feedback_supabase_migration_naming.md`).

### Schema explicitly NOT changed

- `public.events` — columns frozen at foundation. New event types are additive via TypeScript zod schemas, no migrations
- Separate audit table for lineup edits — not building. `updated_at` + Vercel logs + Supabase logical replication are enough for an MVP

---

## 4. Telemetry helper + emit sites

### Event taxonomy (locked at start of 3b-1; additive thereafter)

| `type` | Emitted from | `payload` shape |
|---|---|---|
| `chat_message` | `/api/chat` server | `{ user_message_len, response_len, retrieved_chunk_count, locale }` |
| `match_completed` | `/api/match` server | `{ artists_count, top_artist, top_score, persona }` |
| `compass_query` | `/api/compass` server | `{ query_len, target_venue_id, latency_ms }` — literal query text not stored to avoid PII (users may include personal info). Length + resolution success + latency are enough for 3c analytics |
| `group_converge` | `/api/group/converge` server | `{ venue_id, friend_count }` |
| `lineup_view` | `/app/lineup` client mount | `{ day, language, has_match }` |
| `artist_blurb_view` | artist sheet open client | `{ artist_name, language, source: 'cache' \| 'live' }` |
| `wait_times_view` | `/app/wait-times` client mount | `{ sort }` |
| `ping_shown` | `<GlobalPingToast>` client | `{ ping_id, urgent }` |
| `ping_tapped` | ping deeplink follow client | `{ ping_id, deeplink }` |
| `broadcast_sent` | `/api/admin/broadcasts` POST server | `{ broadcast_id, urgency, has_target_venue, language: 'en+ro' }` |
| `broadcast_received` | `useBroadcastsRealtime` client INSERT handler | `{ broadcast_id, latency_ms }` |

Strict zod schema per type lives in `bonti/src/lib/telemetry/events.ts`. Payload union enforced before insert.

### Server-side helper

`bonti/src/lib/telemetry/log-event.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { EventPayloadByType, EventType } from "./events";

export async function logEvent<T extends EventType>(
  type: T,
  payload: EventPayloadByType[T],
  sessionId?: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("events").insert({
      type,
      payload,
      session_id: sessionId ?? null,
    });
  } catch (e) {
    console.error("[telemetry] log failed", type, e);
  }
}
```

Callers wrap in `void logEvent(...)` — response goes out immediately, insert happens in the background.

### Client → `/api/events` route

`bonti/src/app/api/events/route.ts` parses body with `BodySchema = z.object({ type: EventTypeSchema, payload: z.unknown() })`, then per-type `EventPayloadSchemas[type].safeParse(payload)`. On success, reads `bonti-session-id` cookie (creates if missing), kicks `void logEvent(...)`, returns `{ ok: true }`.

### Anonymous session ID

`bonti/src/lib/telemetry/session.ts`:
- `getOrCreateSessionId()` → reads `bonti-session-id` cookie, generates uuid if missing
- httpOnly, sameSite=lax, 30-day TTL, secure in prod
- Set on first event POST (lazy) so we never set a cookie for a visitor who never triggers an event

### Client hook

`bonti/src/hooks/use-event-logger.ts`:

```ts
export function useEventLogger() {
  return useCallback(<T extends EventType>(
    type: T,
    payload: EventPayloadByType[T],
  ) => {
    const body = JSON.stringify({ type, payload });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/events", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
        keepalive: true,
      });
    }
  }, []);
}
```

`sendBeacon` matters for `ping_tapped` — user is navigating away when they tap. Other events use `fetch({ keepalive: true })`.

### Exact emit-site list

**Server (add `void logEvent(...)` after success):**
- `bonti/src/app/api/chat/route.ts` — after final response chunk sent
- `bonti/src/app/api/match/route.ts` — after match result computed
- `bonti/src/app/api/compass/route.ts` — after venue resolved
- `bonti/src/app/api/group/converge/route.ts` — after converge response
- `bonti/src/app/api/admin/broadcasts/route.ts` — after insert returns

**Client (call `log(...)` from hook):**
- `/app/lineup` client child — `useEffect` on mount → `lineup_view`
- artist sheet component — open handler → `artist_blurb_view`
- `/app/wait-times` client child — mount → `wait_times_view`
- `bonti/src/components/ping-toast.tsx` — show effect → `ping_shown`
- `bonti/src/components/ping-toast.tsx` deeplink onClick → `ping_tapped`
- `bonti/src/hooks/use-broadcasts-realtime.ts` — INSERT handler → `broadcast_received` (compute `latency_ms = Date.now() - new Date(row.sent_at).getTime()`)

---

## 5. Lineup CMS surface

### Routes added

| Method | Path | Purpose |
|---|---|---|
| — | `/admin/lineup` | Server-rendered list page + client editor |
| GET | `/api/admin/lineup` | List all entries (admin-gated) |
| POST | `/api/admin/lineup` | Create entry |
| PATCH | `/api/admin/lineup/[id]` | Update entry |
| DELETE | `/api/admin/lineup/[id]` | Remove entry |

All four API routes: `try { await requireAdmin() } catch (AdminAuthError) → 401/403` — same pattern as Plan 3a's broadcasts API.

### Page layout

Reuses the `/admin` shell from Plan 3a (header, branding, sign-out). Adds tabs `[All | Friday | Saturday | Sunday]`.

```
┌────────────────────────────────────────────────────────────┐
│  Bonți Ops  ·  Lineup                              [+ Add] │
├────────────────────────────────────────────────────────────┤
│  [ All ]  [ Friday ]  [ Saturday ]  [ Sunday ]            │
├────────────────────────────────────────────────────────────┤
│  JUSTIN TIMBERLAKE     Main Stage    Fri 22:00–23:30   ✎  │
│  GLASS ANIMALS         Main Stage    Sat 22:00–23:30   ✎  │
│  GORILLAZ              Hangar Stage  Sun 21:30–23:00   ✎  │
│  …                                                         │
└────────────────────────────────────────────────────────────┘
```

Row layout: `font-sofia uppercase` artist + `font-roboto text-bonti-text/60` stage + start–end (or "TBA"). EC tags as small chips below. Sticky `[+ Add]` top-right. Same `bg-white rounded-lg shadow-sm divide-y` aesthetic as `BroadcastRecentList`.

### Edit sheet

Triggered by ✎. Bottom sheet on mobile, right drawer (~480px) on desktop.

Fields:
- **Artist name** — text input, max 80 chars
- **Day** — segmented control Fri/Sat/Sun
- **Stage** — text input + autocomplete from existing distinct stages
- **Start / End** — two `<input type="datetime-local">`; helper "Leave blank for TBA"
- **EC tags / Genres** — comma-separated chip inputs
- **Photo URL** — text input, optional, validated as URL
- **Sort order** — number input, default `(max in day) + 10`

Footer: `[Cancel]   [Delete]   [Save]`. Delete requires typing the artist name to confirm.

### Server-side validation

`bonti/src/lib/admin/lineup-schema.ts`:

```ts
const isoOrNull = z.union([z.string().datetime(), z.literal(""), z.null()])
  .transform(v => (v ? v : null));

export const LineupEntryInput = z.object({
  artist_name: z.string().min(1).max(80),
  day: z.enum(["Friday", "Saturday", "Sunday"]),
  stage: z.string().min(1).max(60),
  start_at: isoOrNull,
  end_at: isoOrNull,
  ec_tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  genres: z.array(z.string().min(1).max(40)).max(10).default([]),
  photo_url: z.string().url().nullable().optional(),
  sort_order: z.number().int().nonnegative().default(0),
}).refine(
  d => !d.start_at || !d.end_at || new Date(d.end_at) > new Date(d.start_at),
  { message: "end_at must be after start_at" },
);
```

PATCH uses `LineupEntryInput.partial()`. Service-role client for inserts/updates (RLS bypass — admin gate already enforced).

### UX flow

Save → PATCH/POST → on 2xx, local list updates immediately, then `router.refresh()` re-fetches server-truth. On failure, revert + inline error. Same `useTransition` pattern as `BroadcastComposeForm`.

---

## 6. Consumer flip + realtime

### `loadLineup()` helper

`bonti/src/data/lineup.ts` keeps exporting the static `LINEUP` (KB ingest and tests still consume it). New server-only export:

```ts
import "server-only";
import { createServerComponentClient } from "@/lib/supabase/server";
import lineupJson from "../../docs/ingest/lineup.json";

export type LineupRow = {
  id: string;
  artist_name: string;
  day: "Friday" | "Saturday" | "Sunday";
  stage: string;
  start_at: string | null;
  end_at: string | null;
  ec_tags: string[];
  genres: string[];
  photo_url: string | null;
  sort_order: number;
};

export async function loadLineup(): Promise<LineupRow[]> {
  try {
    const supabase = await createServerComponentClient();
    const { data, error } = await supabase
      .from("lineup_entries")
      .select("*")
      .order("day", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("artist_name", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("empty");
    return data as LineupRow[];
  } catch (e) {
    console.error("[lineup] DB read failed, falling back to static JSON", e);
    return staticFallback();
  }
}
```

Fallback is demo-time insurance, not graceful-degradation papering over a real bug. Plan-task explicitly notes to **remove the fallback after pilot**.

### `/app/lineup` flip

1. Server component calls `await loadLineup()`
2. Passes rows to existing client `<LineupClient>` which owns tab state and artist sheet
3. `LineupEntry` type changes from JSON shape to `LineupRow` (adds `id`, `start_at`, `end_at`, `photo_url`)
4. Match-score overlay continues to join by `artist_name` against `music_matches` — unchanged
5. Time range renders as `font-roboto text-bonti-text/60` line under the stage; falls back to "TBA" when null

**Timezone:** All set times stored as `timestamptz` (UTC on the wire), rendered in `Europe/Bucharest` on both `/app/lineup` and `/admin/lineup` via a shared `formatLocalTime(iso: string): string` util in `bonti/src/lib/festival/time.ts`. The admin edit-sheet's `<input type="datetime-local">` reads/writes local time in the browser's timezone and is converted to UTC before the PATCH body is built — the form helper makes this explicit ("All times Europe/Bucharest").

### `useLineupRealtime(initialRows)`

`bonti/src/hooks/use-lineup-realtime.ts` — subscribes to `lineup_entries` channel with `event: "*"` (INSERT/UPDATE/DELETE), applies changes via a pure reducer:

```ts
function applyChange(prev: LineupRow[], payload): LineupRow[] {
  switch (payload.eventType) {
    case "INSERT": return [...prev, payload.new].sort(byDayThenSort);
    case "UPDATE": return prev.map(r => r.id === payload.new.id ? payload.new : r).sort(byDayThenSort);
    case "DELETE": return prev.filter(r => r.id !== payload.old.id);
    default: return prev;
  }
}
```

Mounted only on `/app/lineup` (not globally). Cleaned up in `useEffect` return. Channel name `bonti-lineup` (no collision with `bonti-broadcasts`).

### Visual flash on update

Track `flashIds: Set<string>` derived from diff between `prev` and `next` rows. Affected `<LineupRowCard>` gets a 1.2s `animate-bonti-shimmer` class — subtle yellow background pulse defined in `globals.css`. Demo moment made visible.

---

## 7. Error handling + safety

### Telemetry must never break UX (load-bearing invariant)

- Server callers use `void logEvent(...)` — never awaited
- Helper catches all errors and only `console.error`s
- Client uses `sendBeacon` / `fetch({ keepalive: true })` — fire-and-forget by design
- `/api/events` returns `{ ok: true }` immediately after queueing — never blocks on DB ack

Failure modes:
- DB down → `console.error`, no user impact, events lost for that window (acceptable)
- Bad client payload → 400 from `/api/events`, server-side blocked by static types
- Table growth → 3c adds retention policy (`delete from events where created_at < now() - interval '30 days'`)

### Lineup CMS — DB-down behavior

- `/app/lineup` → static JSON fallback (Section 6)
- `/admin/lineup` → does **not** fall back. Renders error state with retry. Silent stale lineup on the admin surface would mislead operators
- API routes → 500 with `{ error: "lineup_db_unavailable" }`

### Admin auth boundaries

Identical to Plan 3a:
- Every `/api/admin/lineup*` route: `try { await requireAdmin() } catch → 401/403 JSON`
- `/admin/lineup` page: `try { await requireAdmin() } catch → redirect("/admin/sign-in")` on 401, render 403 on 403

### RLS verification (run as integration test before merge)

```ts
const anon = createBrowserClient();

// Public read succeeds
const { data: read } = await anon.from("lineup_entries").select("*");
assert(read && read.length > 0);

// Anon write blocked (no write policy)
const { error: writeErr } = await anon.from("lineup_entries").insert({...});
assert(writeErr);

// Anon insert on events blocked — must route through /api/events
const { error: eventsErr } = await anon.from("events").insert({...});
assert(eventsErr);
```

### Input validation

- All admin routes → zod parse before DB
- `/api/events` → zod parse type + per-type payload schema before insert
- Photo URLs → `z.string().url()` rejects javascript: / data:. Render with `referrerPolicy="no-referrer"`

### Realtime channel hygiene

- `bonti-lineup` namespace (distinct from `bonti-broadcasts`)
- Unsubscribed in `useEffect` cleanup
- Mounted only on `/app/lineup`, not in `/app/layout.tsx`

### Intentionally NOT guarding against

- CSRF on `/api/events` — endpoint is telemetry, no PII, no side effects beyond a log row
- Rate-limiting `/api/events` — Supabase egress not the bottleneck; add upstash later if abused
- Lineup write conflicts — admin team is small, last-write-wins is fine, `updated_at` exists for future conflict detection

---

## 8. Demo orchestration

### 60-second beat

```
00:00  "Bonți's content is now editable by EC ops, no deploy."
00:05  Judge holds phone on /app/lineup, Saturday tab.
       Justin Timberlake row shows "Main Stage · 22:00–23:30".
00:10  Switch to laptop. /admin/lineup, signed in.
00:15  Click ✎ next to Justin Timberlake.
00:20  Change end_at to 23:00. Save.
00:23  Judge's phone: row shimmers yellow → time updates to 22:00–23:00.
00:30  "And every action Bonți takes is being logged for the pilot dashboard."
00:35  Terminal: `pnpm tsx scripts/event-counts.ts`
         chat_message       142
         match_completed     38
         compass_query       27
         lineup_view         89
         ping_shown          54
         ping_tapped         12
         broadcast_received  54
00:50  "Plan 3c turns that into the dashboard for EC's ops team."
01:00  Done.
```

### Pre-demo state

- 24 artists seeded via migration on first push — no manual ritual
- 5–10 set times filled in for headliners during the buildathon period (dogfooding the CMS)
- `events` populated organically by buildathon usage — if too sparse on demo day, skip the terminal beat and end on the live-edit moment

### Things deliberately NOT in the demo

- **No demo-mode toggle** on `/admin/lineup`. Real CMS — see `feedback_demos_are_product_not_theater.md`
- **No fake event injector.** Real numbers or skip the screen
- **No staged edit script.** Improvise the edit live; if it fails, retry once

### Telemetry-count script

`bonti/scripts/event-counts.ts` — a 10-line script that prints `select type, count(*) from events where created_at > now() - 7d group by type` via `console.table`. Run from laptop terminal during demo. No new admin surface needed.

### Risks acknowledged

1. **EC's actual lineup drifts from our seed** — the demo edit could land on the wrong artist. Mitigation: keep `artist_name` flexible; backfill real EC set times through the admin UI during the buildathon
2. **Conference wifi blocks WebSockets** — realtime fails. Mitigation: phone hotspot fallback. Recovery beat: tab-off/tab-on triggers server re-fetch
3. **events table growth** — ~5k rows by buildathon end is fine. 3c adds retention

---

## 9. Handoff contract to Plan 3c

When Plan 3c (insights dashboard) starts, it can rely on these stable surfaces.

### Stable: `public.events` table

- Schema frozen: `(id uuid, type text, payload jsonb, session_id uuid, created_at timestamptz)`
- Indexes: `events_type_idx`, `events_created_idx`, `events_payload_gin_idx`
- Inserts via `logEvent()` (server) or `/api/events` (client) — both zod-validated
- Event types and payloads as locked in Section 4. New types are additive only; existing payload keys never disappear (only become nullable or extended)
- `session_id` is the anonymous-visitor join key — `count(distinct session_id) where created_at::date = X`

### Stable: `public.lineup_entries` table + realtime channel

- Schema frozen as in Section 3
- `(artist_name, day, stage)` unique index — reliable join key
- `lineup_entries_public_read` RLS policy stays; writes service-role only
- In `supabase_realtime` publication — 3c can subscribe too
- `start_at`/`end_at` may be NULL — queries must coalesce

### Stable: `logEvent()` helper signature

```ts
logEvent<T extends EventType>(
  type: T,
  payload: EventPayloadByType[T],
  sessionId?: string,
): Promise<void>
```

Always fire-and-forget; never throws. 3c may add new event types in the same `events.ts` file.

### Stable: `requireAdmin()` + `ADMIN_EMAILS`

- 3c builds `/admin/insights` under the same gate
- `/admin/*` namespace owned by admin features; 3c adds a nav link in the shell header

### Stable: anonymous session cookie

- `bonti-session-id`, httpOnly, 30-day TTL, signed
- Helper `getOrCreateSessionId()` reads or generates

### Owned by 3c

- `/admin/insights` route + UI
- Aggregation queries (counts, conversion rates, funnel metrics, broadcast latency percentiles)
- Retention policy on `events` (Supabase cron `delete from events where created_at < now() - interval '30 days'`)
- Materialized views or rollup tables for fast dashboard reads
- Charts/viz library choice (recharts, visx, or hand-rolled SVG)

### Things 3c will likely want that 3b is NOT building

- **Funnel join across event types** — 3b's table supports it via `session_id` + `created_at`; 3c writes the queries
- **`events.user_id` column** — not in 3b; can be added as nullable when auth-aware events land
- **Per-broadcast follow-rate** — data is already in `ping_shown` + `ping_tapped` payloads (`broadcast_id`); 3c writes the query

### Open items for 3c to decide

1. Realtime vs polled dashboard — recommend polled; realtime on high-traffic events is wasteful for ops
2. Multi-tenant (`festival_id` on events + lineup_entries) — cheap migration when EC adds cities
3. PII review with EC before pilot launch — currently no PII (chat logs lengths, not contents), but legal should confirm

---

## 10. Out of scope (explicit)

- **Artist photo upload** — admin pastes a URL; no file upload, no Supabase Storage. Add post-pilot if EC asks
- **Multi-language artist bios in CMS** — `artist_blurbs` cache from Plan 2 still LLM-driven. CMS doesn't expose overrides. Add in 3c if needed
- **Lineup change history / audit log** — `updated_at` + Vercel logs are sufficient. Add an audit table in 3c if EC wants attribution
- **Insights dashboard itself** — owned by Plan 3c
- **Auth-aware events** — no `user_id` on events. Anonymous session is the only dimension
- **Performance optimization** — no materialized views, no pre-aggregation. Plan 3c addresses if dashboards get slow
