# Bonți Live Broadcasts (Plan 3a) — Design Spec

**Date:** 2026-05-24
**Status:** Approved, ready for plan
**Predecessors:** Plan 0 (foundation), Plan 1 (music match), Plan 2 (in-festival surfaces)
**Successor:** Plan 3b (admin CMS + insights dashboard) — deferred

---

## 1. Goal

Wire up Supabase Realtime so an authorized EC ops user can compose a live broadcast on `/admin/broadcasts` and have it appear within ~1s on every Bonți `/app` session as a toast + ping-feed entry + live-ticker headline. This is the Act 6 dramatic beat of the demo arc.

**Win condition:** Andrei types a broadcast on his laptop, hits Send, and Maria's phone (or its cast view) shows the toast within 1-2 seconds. The trigger surface IS the product surface — no backstage buttons.

---

## 2. Architecture

```
[admin laptop]                          [Maria's phone]
/admin/broadcasts                       /app/*
   ├─ list (read from broadcasts)          ├─ useBroadcastsRealtime()
   ├─ compose form                         │     ├─ on mount: SELECT last 12h
   │   └─ POST /api/admin/broadcast/draft  │     ├─ on INSERT: broadcast → ping → appendPing
   │      (LLM bilingual draft, buffered)  │     └─ dedupes by broadcast-{id}
   └─ POST /api/admin/broadcasts           ├─ GlobalPingToast (existing, unchanged)
         └─ INSERT into broadcasts         ├─ live-ticker (refactored: reads store)
              ↓                            └─ /app/notifications (existing, unchanged)
         Realtime publishes INSERT ───────►
```

**Boundaries:**
- `broadcast → ping` mapper is a pure function in `src/lib/festival/broadcast-to-ping.ts`
- `useBroadcastsRealtime` hook owns Supabase channel lifecycle
- Admin routes under `/admin/*`, never linked from `/app`, gated by server-side auth + email allowlist
- Existing `appendPing` action remains the single ingestion point — broadcasts and seeded pings share one pipeline

**Reuse from Plan 2:**
- `appendPing` dedupes by id (Zustand store action)
- `PingToast`, `PingRow`, `GlobalPingToast` render any `SeededPing`-shaped object
- `/app/notifications` lists pings — broadcasts inherit the surface for free
- `LiveTicker` already exists; data source swaps from static `SEEDED_BROADCASTS` to Zustand store

---

## 3. Data model

### 3.1 Existing table (no change to base columns)

`public.broadcasts` was created in foundation migration `20260523000400_broadcasts.sql`:

```sql
create table public.broadcasts (
  id            uuid primary key default gen_random_uuid(),
  source_text   text not null,
  ai_draft_en   text,
  ai_draft_ro   text,
  final_en      text not null,
  final_ro      text not null,
  target        text not null default 'all',
  urgency       text not null default 'standard' check (urgency in ('standard', 'critical')),
  sent_by       uuid references auth.users(id) on delete set null,
  sent_at       timestamptz not null default now()
);
alter publication supabase_realtime add table public.broadcasts;
```

### 3.2 Migration patch — add ping rendering fields

`supabase/migrations/20260524100000_broadcasts_title_fields.sql`:

```sql
alter table public.broadcasts
  add column title_en text not null default '',
  add column title_ro text not null default '',
  add column deeplink text,
  add column target_venue_id text;

alter table public.broadcasts enable row level security;

create policy "broadcasts_public_read"
  on public.broadcasts for select
  using (true);

-- Insert/update/delete: no client-side policy. Server uses service-role.
```

**Rationale:**
- `title_en`/`title_ro` — `PingToast`/`PingRow` render bold title + body. Without titles, broadcast pings would look visually inconsistent with seeded pings. Default `''` so existing rows don't break.
- `deeplink` — optional URL for tap action.
- `target_venue_id` — admin picks a venue from a dropdown; server derives deeplink as `/app/compass?target=${id}`. Lets admin write "Glass Animals at Main" without thinking about URLs.

### 3.3 Seed migration — historical broadcasts

`supabase/migrations/20260524100100_seed_broadcasts.sql`:

```sql
insert into public.broadcasts (id, source_text, final_en, final_ro, title_en, title_ro, sent_at) values
  ('00000000-0000-0000-0000-000000000001',
   'Road back full after Timberlake',
   '⚡ Road back is full after Timberlake. Shuttle paused till 3. Stay — set at The Beach, after at Hangar.',
   '⚡ Drumul înapoi e plin după Timberlake. Shuttle-ul revine la 3. Stai la festival — e un set la The Beach și un after la Hangar.',
   'Shuttle paused', 'Shuttle-ul stă pe loc',
   '2026-07-18T19:45:00+03:00'),
  ('00000000-0000-0000-0000-000000000002',
   'Booha running late',
   'Booha set running 10 min late.',
   'Booha întârzie 10 minute.',
   'Booha 10 min late', 'Booha la 10 min',
   '2026-07-18T20:30:00+03:00')
on conflict (id) do nothing;
```

`SEEDED_BROADCASTS` constant in `src/data/festival-state.ts` is removed — `LiveTicker` reads from the store, populated by the on-mount SELECT.

### 3.4 Broadcast → Ping mapper

`src/lib/festival/broadcast-to-ping.ts` (pure function, no I/O):

```ts
import type { SeededPing } from "@/data/festival-state";

export type BroadcastRow = {
  id: string;
  final_en: string;
  final_ro: string;
  title_en: string;
  title_ro: string;
  deeplink: string | null;
  target_venue_id: string | null;
  urgency: "standard" | "critical";
  sent_at: string;
};

export function broadcastToPing(row: BroadcastRow, lang: "en" | "ro"): SeededPing {
  const title = lang === "ro" ? row.title_ro : row.title_en;
  const body  = lang === "ro" ? row.final_ro : row.final_en;
  const deeplink =
    row.deeplink ??
    (row.target_venue_id ? `/app/compass?target=${row.target_venue_id}` : "/app/notifications");
  return {
    id: `broadcast-${row.id}`,
    fires_at: row.sent_at,
    lang,
    title: title || "⚡ Live update",
    body,
    deeplink,
  };
}
```

The `broadcast-` id prefix prevents collision with seeded ping ids and lets `appendPing`'s existing dedupe handle reconnects/re-hydration cleanly.

---

## 4. Per-surface design

### 4.1 `/admin/broadcasts` (admin compose surface)

**Auth gate:** Server component calls `lib/supabase/server.ts` → `auth.getUser()`. If no session, redirect to `/admin/sign-in`. If session exists but email not in `ADMIN_EMAILS` env var (comma-separated), render 403 page. Otherwise render the compose page.

**`/admin/sign-in`:** Single-button Google OAuth flow (Supabase Auth provider already configured). Returns to `/admin/broadcasts` on success.

**Layout (laptop-first, but responsive):**

```
┌─────────────────────────────────────────────┐
│ Bonți Ops · broadcasts                  ⏻  │
├─────────────────────────────────────────────┤
│ Compose                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ What happened? (one line, RO or EN)     │ │
│ │ [textarea — source_text, max 280]       │ │
│ └─────────────────────────────────────────┘ │
│ Target venue:  [dropdown — venue.ts ids]    │
│ Urgency:       (•) standard  ( ) critical   │
│                                             │
│   [ ✨ Draft with AI ]                      │
│                                             │
│ ┌─ EN ──────────────────────────────────┐   │
│ │ Title:  [input, max 60]               │   │
│ │ Body:   [textarea, max 280]           │   │
│ └───────────────────────────────────────┘   │
│ ┌─ RO ──────────────────────────────────┐   │
│ │ Title:  [input, max 60]               │   │
│ │ Body:   [textarea, max 280]           │   │
│ └───────────────────────────────────────┘   │
│                                             │
│              [ Send broadcast → ]           │
├─────────────────────────────────────────────┤
│ Recent (last 24h)                           │
│ • 20:30  Booha 10 min late                  │
│ • 19:45  Shuttle paused                     │
└─────────────────────────────────────────────┘
```

**Flow:**
1. Admin types one-line `source_text` (any language) + optional target venue + urgency
2. Clicks **Draft with AI** → POST `/api/admin/broadcast/draft` → drafts populate editable inputs
3. Admin can edit titles/bodies inline
4. Clicks **Send broadcast** → POST `/api/admin/broadcasts` → INSERT row → Realtime fires
5. Form clears, "Recent" list refreshes, brief inline success indicator
6. Critical urgency: send button shows red accent, downstream PingToast renders with red border + no auto-dismiss

### 4.2 `/app/*` consumer (minimal changes)

**`useBroadcastsRealtime` hook** in `src/hooks/use-broadcasts-realtime.ts`:
- Mounted once in `src/app/app/layout.tsx` alongside `GlobalPingToast`
- On mount:
  - `SELECT * FROM broadcasts WHERE sent_at > now() - interval '12 hours' ORDER BY sent_at`
  - Maps each row → ping via `broadcastToPing(row, "ro")` (Maria's locale; hardcoded for demo, lifted to user pref in Plan 3b)
  - Calls `appendPing(ping, { silent: true })` for each hydrated row — adds to pings array + marks id in `silentPingIds` set so toast is suppressed
- Subscribes to channel `broadcasts:insert`, on INSERT event:
  - Maps row → ping → `appendPing(ping)` (no `silent` flag; toast fires)
- Cleanup: unsubscribe on unmount

**Store changes (`src/lib/festival/store.ts`):**
- Extend `appendPing` action signature: `appendPing(ping: SeededPing, opts?: { silent?: boolean })`
- Add new state field: `silentPingIds: Set<string>` (or array; persist excluded — runtime only)
- When `opts.silent === true`, action adds `ping.id` to `silentPingIds` before/after appending to pings
- Existing call sites (Plan 2's Glass Animals setTimeout, the converge ETA flow) keep working — `opts` is optional

**`<GlobalPingToast>` change:**
- Subscribe to both `pings` and `silentPingIds` from store
- When a new ping appears in pings, check: is `ping.id` in `silentPingIds`? If yes, skip toast (still adds to local `seenSet` Ref so a future `silentPingIds` removal can't re-trigger it)
- Existing seenSet Ref deduplication behavior unchanged

**`<LiveTicker>` change:** Reads latest broadcast from Zustand store (filter pings where `id.startsWith("broadcast-")`, sort by `fires_at` desc, take first). Static `SEEDED_BROADCASTS` import removed. Empty state: shows "Live updates appear here".

**`<GlobalPingToast>`:** No change.

**`<PingToast>` + `<PingRow>`:** Tiny addition — if the ping's underlying broadcast row has `urgency === "critical"`, render with `border-red-500` accent and no auto-dismiss. Implementation: extend `SeededPing` with optional `urgent?: boolean` field; the mapper sets it from `row.urgency === "critical"`.

**`/app/notifications`:** No change. Renders pings from store.

### 4.3 API routes

**`POST /api/admin/broadcast/draft`**
- Body (zod-validated): `{ source_text: string (1-280), target_venue_id?: string|null, urgency: 'standard'|'critical' }`
- Server: verify admin session + email allowlist (shared helper `lib/admin/require-admin.ts`)
- Calls OpenRouter via `match-llm.ts` pattern: `generateText` only, walk `[BONTI_LLM, ...FALLBACK_MODELS]`, 20s `AbortController`, `maxRetries: 0`, JSON extract via fence-strip + outermost `{}` slice + zod parse
- System prompt embeds Bonți tone-of-voice rules from `docs/research/ec-tone-of-voice.md` + venue context (looked up via `findVenueById` if `target_venue_id`)
- Response (zod-validated): `{ title_en: string, body_en: string, title_ro: string, body_ro: string }`

**`POST /api/admin/broadcasts`**
- Body (zod-validated): `{ source_text, title_en, body_en, title_ro, body_ro, target_venue_id?, urgency, deeplink? }`
- Server: verify admin session + email allowlist
- INSERT via `createAdminClient()` (service-role bypasses RLS)
- Stamps `sent_by = session.user.id`, `sent_at = now()`
- Maps `body_en → final_en`, `body_ro → final_ro` for table compatibility
- Response: `{ id }` of the inserted row

**`GET /api/admin/broadcasts`**
- Server: verify admin session + email allowlist
- Returns: `{ broadcasts: BroadcastRow[] }` from last 24h, sorted desc

---

## 5. Error handling, testing, security

### 5.1 Auth gate

- `lib/admin/require-admin.ts` shared helper: returns `{ user, supabase }` if allowed, throws `AdminAuthError` with status 401/403 otherwise
- Allowlist via env: `ADMIN_EMAILS=andrei.voic@rebeldot.com` (comma-separated)
- API routes wrap handler with try/catch on `AdminAuthError` → return 401 or 403
- Server components wrap with try/catch → redirect or 403 page

### 5.2 Realtime resilience

- Three states tracked internally: `subscribing`, `subscribed`, `disconnected`
- Supabase JS client auto-reconnects with exponential backoff (built-in)
- On re-subscribe, re-run the 12h SELECT to catch broadcasts that arrived during the gap. Idempotent via `appendPing` dedupe
- No visible connection-state UI for demo — silent recovery

### 5.3 LLM draft failure

- AI draft is non-critical: 500 or 20s timeout → inline error toast on `/admin/broadcasts`, admin continues composing manually
- Send button doesn't depend on draft having run
- Uses same fallback chain as `match-llm.ts` — single model failure walks to next

### 5.4 Validation

- Server-side zod on every POST body
- AI draft response: zod parse on extracted JSON; one retry if parse fails

### 5.5 Replay edge cases

| Scenario | Behavior |
|---|---|
| User opens `/app` 30 min after broadcast fires | Load-on-mount SELECT picks it up → `appendPing(ping, { silent: true })` → renders in notifications, NO toast |
| User has `/app` open across a broadcast firing | Realtime INSERT → `appendPing(ping)` (no silent flag) → toast fires |
| User reloads `/app` after broadcast already fired | Same as scenario 1 — silent hydration, no toast |
| Realtime drops mid-session, broadcast fires, then reconnects | Re-subscribe triggers re-SELECT → silent hydration catches missed broadcasts |
| Same broadcast received twice via Realtime (network blip) | `appendPing` dedupes by ping id; `silentPingIds` set never shrinks during a session |

### 5.6 RLS audit

- `broadcasts` public read intentional — `/app` clients read with anon key
- No client-side insert/update/delete policies — server uses service-role behind auth-gated routes
- Anon role cannot mutate broadcasts under any code path

### 5.7 Test coverage

| Layer | Test | Mock strategy |
|---|---|---|
| `broadcast-to-ping.ts` | EN/RO mapping, deeplink fallback, missing title fallback, urgency flag | None — pure function |
| `/api/admin/broadcasts` (POST) | Auth gate (no session → 401; wrong email → 403; happy path → 200) | Mock Supabase auth + admin client |
| `/api/admin/broadcast/draft` (POST) | Zod validation, JSON extract success, JSON extract failure with retry, fallback chain walk | Mock OpenRouter via vitest |
| `use-broadcasts-realtime` | On-mount SELECT hydrates pings, on-INSERT appends, dedupe works, hydrated rows don't trigger toast | Mock Supabase client (channel.on, channel.subscribe) |
| `/admin/broadcasts` E2E | Compose → Draft → Send → see in `/app` notifications + toast | Manual against staging |

### 5.8 Secrets posture

- `ADMIN_EMAILS` — env, comma-separated allowlist (added to `.env.local` + Vercel prod)
- Service-role key already wired (`SUPABASE_SERVICE_ROLE_KEY`)
- No new external secrets

---

## 6. Demo orchestration (Act 6)

### 6.1 Pre-demo setup

1. Seed migration applied — 2 historical broadcasts live in table. Maria's `/app` mount fetches them → appear in `/app/notifications`, no toasts
2. Andrei signs into `/admin/broadcasts` on his laptop via Google OAuth, leaves tab open
3. Plan 2's 8s `setTimeout` Glass Animals ping still fires from client — unchanged

### 6.2 Act 6 — live broadcast

1. Narrator: *"and here's EC ops pushing a live broadcast — same channel powering the festival's official comms"*
2. Andrei switches to laptop → `/admin/broadcasts` visible to judges
3. Types into `source_text`: `"Justin Timberlake starts in 5 min, head to Main"`
4. Selects target venue: **Main Stage** (auto-fills deeplink server-side)
5. Clicks **✨ Draft with AI** — EN/RO drafts populate in ~2-3s. Narrator: *"tone-matched to EC's voice, bilingual"*
6. Clicks **Send broadcast**
7. Switches back to Maria's phone (or cast view) within 1-2s → toast slides in: *"Justin Timberlake începe în 5 min — Main Stage"*
8. Maria taps toast → `/app/compass?target=main_stage` → compass arrow points to Main Stage
9. Narrator close: *"Every Bonți phone on the field gets it. Realtime. EC keeps editorial control."*

### 6.3 Why this isn't theater

- `/admin/broadcasts` is the genuine product surface EC ops would use post-pilot
- On-brand Tailwind/shadcn styling — looks like an internal console, not a demo control room
- AI draft is real product value (saves typing, ensures tone, bilingual instantly)
- No hidden buttons on `/app`; no query-param triggers; the only path to a broadcast is the admin surface with admin auth

### 6.4 Demo-day fallback

- If WebSocket drops between Maria's phone and Supabase mid-demo, the broadcast still INSERTs (API route doesn't depend on the channel)
- Plan B: page reload on Maria's phone hydrates from the SELECT and shows the broadcast in notifications. Toast missed, but the wire-up is verified
- Post-Plan-3a polish: optional 30s background poll as belt-and-suspenders. YAGNI for 3a.

---

## 7. Out of scope (deferred to Plan 3b)

- Full admin CMS for lineup / artist editing
- Insights dashboard (chat volume, top intents, top requested artists)
- Targeted broadcasts (filter by location, persona, group)
- Multi-locale broadcasts (currently EN + RO only, hardcoded)
- User language preference (currently hardcoded `lang: "ro"` for Maria)
- Broadcast scheduling (send-at-time, recurring)
- Broadcast templates / preset categories
- Push notifications outside the app session (PWA push)
- Broadcast deletion / edit-after-send
- Admin user management UI (allowlist stays in env for 3a)

---

## 8. Plan 3a → 3b handoff contract

Plan 3b will extend without breaking Plan 3a's surfaces:
- `broadcasts` table columns are stable — 3b may add filter columns (e.g., `target_persona`) as nullable
- `useBroadcastsRealtime` hook signature stable — 3b adds optional filter args
- `/admin/*` routes namespace owned by admin features
- Insights dashboard reads from `events` + `festival_sessions` tables (already exist in foundation), zero impact on broadcast surfaces

---

## 9. File inventory

**New files:**
- `supabase/migrations/20260524100000_broadcasts_title_fields.sql`
- `supabase/migrations/20260524100100_seed_broadcasts.sql`
- `src/lib/festival/broadcast-to-ping.ts` + test
- `src/lib/admin/require-admin.ts` + test
- `src/hooks/use-broadcasts-realtime.ts` + test
- `src/app/admin/layout.tsx`
- `src/app/admin/broadcasts/page.tsx`
- `src/app/admin/sign-in/page.tsx`
- `src/components/admin/broadcast-compose-form.tsx`
- `src/components/admin/broadcast-recent-list.tsx`
- `src/app/api/admin/broadcasts/route.ts` + test
- `src/app/api/admin/broadcast/draft/route.ts` + test
- `src/lib/admin/draft-prompt.ts` (tone-aware system prompt)

**Modified files:**
- `src/data/festival-state.ts` — remove `SEEDED_BROADCASTS` constant; extend `SeededPing` type with optional `urgent?: boolean`
- `src/lib/festival/store.ts` — extend `appendPing` signature with `opts?: { silent?: boolean }`; add `silentPingIds` state field
- `src/components/live-ticker.tsx` — read latest broadcast-prefixed ping from Zustand store
- `src/components/global-ping-toast.tsx` — consult `silentPingIds` before toasting
- `src/components/ping-toast.tsx` + `src/components/ping-row.tsx` — handle `urgent` flag (red border, no auto-dismiss for toast)
- `src/app/app/layout.tsx` — mount `useBroadcastsRealtime` hook
- `.env.local` + Vercel — add `ADMIN_EMAILS`

**Estimated task count:** 10-12 atomic tasks.
