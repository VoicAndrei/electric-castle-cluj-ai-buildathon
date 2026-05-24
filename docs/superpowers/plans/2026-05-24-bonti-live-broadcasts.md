# Bonți Live Broadcasts (Plan 3a) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Supabase Realtime so an authorized EC ops user composes a broadcast on `/admin/broadcasts` and every `/app` session receives it within ~1s as a toast + notifications entry + live-ticker headline.

**Architecture:** Admin compose flow (auth-gated `/admin/*`) → POST `/api/admin/broadcasts` → INSERT into `public.broadcasts` → Supabase Realtime publishes INSERT → `useBroadcastsRealtime` hook on `/app` maps row to ping via pure function → `appendPing` (Zustand) → existing toast/ping-row pipeline renders. Hydration on mount uses a `silent` flag so historical broadcasts populate notifications without toasting.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui · Supabase (SSR + service-role + Realtime + Google OAuth) · Zustand · OpenRouter via Vercel AI SDK · vitest

**Spec:** `docs/superpowers/specs/2026-05-24-bonti-live-broadcasts-design.md`

**Cumulative file inventory (for context):**

NEW:
- `bonti/supabase/migrations/20260524100000_broadcasts_title_fields.sql`
- `bonti/supabase/migrations/20260524100100_seed_broadcasts.sql`
- `bonti/src/lib/festival/broadcast-to-ping.ts`
- `bonti/src/lib/admin/require-admin.ts`
- `bonti/src/lib/admin/draft-prompt.ts`
- `bonti/src/lib/admin/draft-schema.ts`
- `bonti/src/hooks/use-broadcasts-realtime.ts`
- `bonti/src/app/admin/layout.tsx`
- `bonti/src/app/admin/sign-in/page.tsx`
- `bonti/src/app/admin/broadcasts/page.tsx`
- `bonti/src/components/admin/broadcast-compose-form.tsx`
- `bonti/src/components/admin/broadcast-recent-list.tsx`
- `bonti/src/app/api/admin/broadcasts/route.ts`
- `bonti/src/app/api/admin/broadcast/draft/route.ts`
- `bonti/tests/unit/broadcast-to-ping.test.ts`
- `bonti/tests/unit/draft-schema.test.ts`
- `bonti/tests/unit/festival-store-broadcast.test.ts`
- `bonti/tests/unit/use-broadcasts-realtime.test.ts`
- `bonti/tests/unit/require-admin.test.ts`
- `bonti/tests/integration/admin-broadcasts-route.test.ts`
- `bonti/tests/integration/admin-broadcast-draft-route.test.ts`

MODIFY:
- `bonti/src/data/festival-state.ts` — remove `SEEDED_BROADCASTS`; add optional `urgent?: boolean` to `SeededPing`
- `bonti/src/lib/festival/store.ts` — extend `appendPing` with `opts?: { silent?: boolean }`; add `silentPingIds: string[]` (array, since Zustand persist serializes JSON)
- `bonti/src/components/global-ping-toast.tsx` — consult `silentPingIds` before toasting
- `bonti/src/components/ping-toast.tsx` — red border + disable auto-dismiss when `urgent`
- `bonti/src/components/ping-row.tsx` — red accent when `urgent`
- `bonti/src/components/live-ticker.tsx` — read latest `broadcast-` ping from Zustand store
- `bonti/src/app/app/layout.tsx` — mount `useBroadcastsRealtime`
- `bonti/.env.local` + Vercel prod env — add `ADMIN_EMAILS`

**Commit anchoring (per repo-level memory):** all `git` commands run from the outer repo root `/Users/andrei.voic/Desktop/electric-castle-cluj-ai-buildathon`, never from `bonti/`.

---

## Task 1: Migrations — title/deeplink columns, RLS, seed historical broadcasts

**Files:**
- Create: `bonti/supabase/migrations/20260524100000_broadcasts_title_fields.sql`
- Create: `bonti/supabase/migrations/20260524100100_seed_broadcasts.sql`

- [ ] **Step 1: Write the title/deeplink/RLS migration**

Write `bonti/supabase/migrations/20260524100000_broadcasts_title_fields.sql`:

```sql
-- Bonti live broadcasts: ping rendering fields + RLS.
alter table public.broadcasts
  add column title_en text not null default '',
  add column title_ro text not null default '',
  add column deeplink text,
  add column target_venue_id text;

alter table public.broadcasts enable row level security;

-- Public read so /app clients (anon) can SELECT recent broadcasts.
create policy "broadcasts_public_read"
  on public.broadcasts for select
  using (true);

-- No insert/update/delete policies: writes go through server routes
-- using the service-role client, which bypasses RLS.
```

- [ ] **Step 2: Write the seed migration**

Write `bonti/supabase/migrations/20260524100100_seed_broadcasts.sql`:

```sql
-- Seed two historical broadcasts so /app/notifications and live-ticker
-- have content on first load. Idempotent via fixed UUIDs.
insert into public.broadcasts
  (id, source_text, final_en, final_ro, title_en, title_ro, sent_at)
values
  ('00000000-0000-0000-0000-000000000001',
   'Road back full after Timberlake',
   '⚡ Road back is full after Timberlake. Shuttle paused till 3. Stay — set at The Beach, after at Hangar.',
   '⚡ Drumul înapoi e plin după Timberlake. Shuttle-ul revine la 3. Stai la festival — e un set la The Beach și un after la Hangar.',
   'Shuttle paused',
   'Shuttle-ul stă pe loc',
   '2026-07-18T19:45:00+03:00'),
  ('00000000-0000-0000-0000-000000000002',
   'Booha running late',
   'Booha set running 10 min late.',
   'Booha întârzie 10 minute.',
   'Booha 10 min late',
   'Booha la 10 min',
   '2026-07-18T20:30:00+03:00')
on conflict (id) do nothing;
```

- [ ] **Step 3: Apply both migrations to linked project**

Run from `bonti/` (Plan 2 used this command for the artist_blurbs migration):

```bash
cd bonti && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN pnpm dlx supabase db push --linked
```

Expected: "Applying migration 20260524100000_broadcasts_title_fields.sql..." and "Applying migration 20260524100100_seed_broadcasts.sql..." both succeed.

- [ ] **Step 4: Verify columns + seed rows**

Run from `bonti/`:

```bash
cd bonti && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN pnpm dlx supabase db remote query "select id, title_en, title_ro, target_venue_id, sent_at from public.broadcasts order by sent_at" --linked 2>&1
```

Expected: 2 rows printed with the seeded titles and sent_at timestamps.

- [ ] **Step 5: Commit**

Run from outer repo root `/Users/andrei.voic/Desktop/electric-castle-cluj-ai-buildathon`:

```bash
git add bonti/supabase/migrations/20260524100000_broadcasts_title_fields.sql bonti/supabase/migrations/20260524100100_seed_broadcasts.sql
git commit -m "feat(broadcasts): add title/deeplink columns + RLS + seed historical rows"
```

---

## Task 2: `broadcast-to-ping` pure function + tests

**Files:**
- Create: `bonti/src/lib/festival/broadcast-to-ping.ts`
- Test: `bonti/tests/unit/broadcast-to-ping.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/unit/broadcast-to-ping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { broadcastToPing, type BroadcastRow } from "@/lib/festival/broadcast-to-ping";

const baseRow: BroadcastRow = {
  id: "11111111-1111-1111-1111-111111111111",
  final_en: "Justin Timberlake starts in 5 min at Main.",
  final_ro: "Justin Timberlake începe în 5 min la Main.",
  title_en: "JT in 5",
  title_ro: "JT în 5",
  deeplink: null,
  target_venue_id: null,
  urgency: "standard",
  sent_at: "2026-07-18T22:10:00+03:00",
};

describe("broadcastToPing", () => {
  it("maps RO with title + body", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.id).toBe("broadcast-11111111-1111-1111-1111-111111111111");
    expect(p.title).toBe("JT în 5");
    expect(p.body).toBe("Justin Timberlake începe în 5 min la Main.");
    expect(p.lang).toBe("ro");
    expect(p.fires_at).toBe(baseRow.sent_at);
  });

  it("maps EN with title + body", () => {
    const p = broadcastToPing(baseRow, "en");
    expect(p.title).toBe("JT in 5");
    expect(p.body).toBe("Justin Timberlake starts in 5 min at Main.");
  });

  it("falls back to '⚡ Live update' when title is empty", () => {
    const p = broadcastToPing({ ...baseRow, title_en: "", title_ro: "" }, "ro");
    expect(p.title).toBe("⚡ Live update");
  });

  it("derives deeplink from target_venue_id", () => {
    const p = broadcastToPing({ ...baseRow, target_venue_id: "main_stage" }, "ro");
    expect(p.deeplink).toBe("/app/compass?target=main_stage");
  });

  it("prefers explicit deeplink over target_venue_id", () => {
    const p = broadcastToPing(
      { ...baseRow, deeplink: "/app/group", target_venue_id: "main_stage" },
      "ro",
    );
    expect(p.deeplink).toBe("/app/group");
  });

  it("falls back to /app/notifications when neither field is set", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.deeplink).toBe("/app/notifications");
  });

  it("sets urgent flag when urgency is critical", () => {
    const p = broadcastToPing({ ...baseRow, urgency: "critical" }, "ro");
    expect(p.urgent).toBe(true);
  });

  it("does NOT set urgent flag for standard urgency", () => {
    const p = broadcastToPing(baseRow, "ro");
    expect(p.urgent).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test broadcast-to-ping
```

Expected: FAIL with "Cannot find module '@/lib/festival/broadcast-to-ping'".

- [ ] **Step 3: Write the implementation**

Write `bonti/src/lib/festival/broadcast-to-ping.ts`:

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
  const body = lang === "ro" ? row.final_ro : row.final_en;
  const deeplink =
    row.deeplink ??
    (row.target_venue_id ? `/app/compass?target=${row.target_venue_id}` : "/app/notifications");
  const ping: SeededPing = {
    id: `broadcast-${row.id}`,
    fires_at: row.sent_at,
    lang,
    title: title || "⚡ Live update",
    body,
    deeplink,
  };
  if (row.urgency === "critical") ping.urgent = true;
  return ping;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd bonti && pnpm test broadcast-to-ping
```

Expected: PASS (8 tests).

The test references `SeededPing.urgent` which doesn't exist yet — TypeScript should still type-check because optional fields are forgiving until Task 3 lands, but the test runtime asserts on the field correctly. If the TypeScript compile fails on `ping.urgent = true`, add this to `bonti/src/data/festival-state.ts` SeededPing type **as part of this commit** (one-line change):

```ts
export type SeededPing = {
  id: string;
  fires_at: string;
  lang: "ro" | "en";
  title: string;
  body: string;
  deeplink?: string;
  urgent?: boolean;  // <-- added
};
```

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/lib/festival/broadcast-to-ping.ts bonti/tests/unit/broadcast-to-ping.test.ts bonti/src/data/festival-state.ts
git commit -m "feat(festival): broadcast-to-ping mapper + SeededPing.urgent"
```

---

## Task 3: Extend store — `silent` flag + `silentPingIds`

**Files:**
- Modify: `bonti/src/lib/festival/store.ts`
- Test: `bonti/tests/unit/festival-store-broadcast.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/unit/festival-store-broadcast.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createFestivalStore, type FestivalStoreApi } from "@/lib/festival/store";
import { LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

describe("festival store — broadcast silent flag", () => {
  let store: FestivalStoreApi;
  beforeEach(() => { store = createFestivalStore(); });

  it("initializes silentPingIds as empty array", () => {
    expect(store.getState().silentPingIds).toEqual([]);
  });

  it("appendPing without opts does NOT add to silentPingIds", () => {
    store.getState().appendPing({
      ...LIVE_GLASS_ANIMALS_PING,
      fires_at: DEMO_NOW.toISOString(),
    });
    expect(store.getState().silentPingIds).toEqual([]);
  });

  it("appendPing with { silent: true } adds id to silentPingIds", () => {
    const ping = { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() };
    store.getState().appendPing(ping, { silent: true });
    expect(store.getState().silentPingIds).toContain(ping.id);
    expect(store.getState().pings[0].id).toBe(ping.id);
  });

  it("appendPing dedupes silentPingIds — calling twice does not duplicate", () => {
    const ping = { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() };
    store.getState().appendPing(ping, { silent: true });
    store.getState().appendPing(ping, { silent: true });
    expect(store.getState().silentPingIds.filter(id => id === ping.id)).toHaveLength(1);
  });

  it("reset clears silentPingIds", () => {
    store.getState().appendPing(
      { ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() },
      { silent: true },
    );
    store.getState().reset();
    expect(store.getState().silentPingIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test festival-store-broadcast
```

Expected: FAIL — `silentPingIds` doesn't exist on FestivalState.

- [ ] **Step 3: Update the store**

Modify `bonti/src/lib/festival/store.ts`. The full file after edits:

```ts
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  MARIA, FRIENDS, SEEDED_PINGS, type Persona, type SeededPing,
} from "@/data/festival-state";

export type StoredPing = SeededPing & { read: boolean; received_at: string };

export type GroupConvergeResult = {
  meeting_point_id: string;
  eta_min: number;
  reason: string;
  target_coords: { x: number; y: number };
};

export type FestivalState = {
  maria: Persona;
  friends: Persona[];
  pings: StoredPing[];
  silentPingIds: string[];
  group_meeting?: { point_id: string; eta_min: number; reason: string };

  appendPing: (p: SeededPing, opts?: { silent?: boolean }) => void;
  applyGroupConverge: (r: GroupConvergeResult) => void;
  markAllPingsRead: () => void;
  reset: () => void;
};

export type FestivalStoreApi = UseBoundStore<StoreApi<FestivalState>>;

const seed = (): Pick<FestivalState, "maria" | "friends" | "pings" | "silentPingIds"> => ({
  maria: { ...MARIA },
  friends: FRIENDS.map(f => ({ ...f })),
  pings: SEEDED_PINGS.map(p => ({ ...p, read: false, received_at: p.fires_at })),
  silentPingIds: [],
});

const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24;
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  },
  removeItem: (key: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(key)}=; Path=/; Max-Age=0; SameSite=Lax`;
  },
};

export function createFestivalStore(): FestivalStoreApi {
  return create<FestivalState>()(
    persist(
      (set) => ({
        ...seed(),

        appendPing: (p, opts) =>
          set((state) => {
            // Dedupe pings by id.
            if (state.pings.some(existing => existing.id === p.id)) {
              // Still track silent flag if requested and not already tracked.
              if (opts?.silent && !state.silentPingIds.includes(p.id)) {
                return { silentPingIds: [...state.silentPingIds, p.id] };
              }
              return {};
            }
            const next: Partial<FestivalState> = {
              pings: [
                { ...p, read: false, received_at: new Date().toISOString() },
                ...state.pings,
              ],
            };
            if (opts?.silent) {
              next.silentPingIds = [...state.silentPingIds, p.id];
            }
            return next;
          }),

        applyGroupConverge: (r) =>
          set((state) => ({
            maria: { ...state.maria, coords: r.target_coords },
            friends: state.friends.map(f => ({ ...f, coords: r.target_coords })),
            group_meeting: { point_id: r.meeting_point_id, eta_min: r.eta_min, reason: r.reason },
          })),

        markAllPingsRead: () =>
          set((state) => ({ pings: state.pings.map(p => ({ ...p, read: true })) })),

        reset: () => set(() => ({ ...seed(), group_meeting: undefined })),
      }),
      {
        name: "bonti_festival_state",
        storage: createJSONStorage(() => cookieStorage),
        partialize: (s) => ({
          maria: s.maria,
          friends: s.friends,
          pings: s.pings,
          group_meeting: s.group_meeting,
          // silentPingIds intentionally excluded — it's runtime-only.
          // After a reload, all broadcasts hydrate via the realtime hook anyway.
        }),
      },
    ),
  );
}

export const useFestivalStore = createFestivalStore();
```

Note the new dedupe-by-id branch added to `appendPing` — previously the action appended unconditionally, but with broadcasts arriving via both SELECT-on-mount and Realtime INSERT, the same id can be processed twice, and we don't want duplicate ping rows.

- [ ] **Step 4: Run all store tests to verify nothing regressed**

```bash
cd bonti && pnpm test festival-store
```

Expected: PASS (existing `festival-store.test.ts` + new `festival-store-broadcast.test.ts`).

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/lib/festival/store.ts bonti/tests/unit/festival-store-broadcast.test.ts
git commit -m "feat(festival): appendPing silent flag + silentPingIds + id dedupe"
```

---

## Task 4: `GlobalPingToast`, `PingToast`, `PingRow` — silent + urgent handling

**Files:**
- Modify: `bonti/src/components/global-ping-toast.tsx`
- Modify: `bonti/src/components/ping-toast.tsx`
- Modify: `bonti/src/components/ping-row.tsx`

This task has no new tests — the behavior is visual and the underlying `silentPingIds` / `urgent` flag logic is already covered by Task 3 (store) and Task 2 (mapper). Manual verification at the end.

- [ ] **Step 1: Update `GlobalPingToast` to consult `silentPingIds`**

Rewrite `bonti/src/components/global-ping-toast.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFestivalStore, type StoredPing } from "@/lib/festival/store";
import { PingToast } from "@/components/ping-toast";

export function GlobalPingToast() {
  const pings = useFestivalStore(s => s.pings);
  const silentPingIds = useFestivalStore(s => s.silentPingIds);
  const [active, setActive] = useState<StoredPing | null>(null);
  // Seed `seen` with current ping ids + silent ids so neither toasts on first render.
  const seen = useRef<Set<string>>(new Set([...pings.map(p => p.id), ...silentPingIds]));

  useEffect(() => {
    for (const p of pings) {
      if (seen.current.has(p.id)) continue;
      seen.current.add(p.id);
      // If the store flagged this id as silent (e.g., hydrated from SELECT), do not toast.
      if (silentPingIds.includes(p.id)) continue;
      setActive(p);
      return;
    }
  }, [pings, silentPingIds]);

  return <PingToast ping={active} onDismiss={() => setActive(null)} />;
}
```

- [ ] **Step 2: Update `PingToast` for urgent flag**

Rewrite `bonti/src/components/ping-toast.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { StoredPing } from "@/lib/festival/store";

export function PingToast({ ping, onDismiss }: { ping: StoredPing | null; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);
  const [lastPingId, setLastPingId] = useState<string | null>(null);

  if (ping && ping.id !== lastPingId) {
    setLastPingId(ping.id);
    setShown(true);
  }

  // Auto-dismiss timer — disabled for urgent broadcasts.
  useEffect(() => {
    if (!ping || !shown || ping.urgent) return;
    const t = setTimeout(() => setShown(false), 6_000);
    return () => clearTimeout(t);
  }, [ping, shown]);

  useEffect(() => {
    if (!shown && ping) {
      const t = setTimeout(onDismiss, 300);
      return () => clearTimeout(t);
    }
  }, [shown, ping, onDismiss]);

  const urgentClass = ping?.urgent ? "ring-2 ring-bonti-red" : "";

  return (
    <AnimatePresence>
      {ping && shown && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={`fixed inset-x-3 top-3 z-50 mx-auto max-w-[460px] bg-bonti-toolbar text-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-3 ${urgentClass}`}
        >
          <BontiAvatar size="sm" animated />
          <Link href={ping.deeplink ?? "/app/notifications"} className="flex-1 min-w-0">
            <p className="font-sofia uppercase text-xs tracking-wide truncate">{ping.title}</p>
            <p className="font-roboto text-sm truncate opacity-90">{ping.body}</p>
          </Link>
          <button
            type="button"
            onClick={() => setShown(false)}
            aria-label="Dismiss"
            className="text-white/60 hover:text-white px-1"
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Update `PingRow` for urgent flag**

Rewrite `bonti/src/components/ping-row.tsx`:

```tsx
import Link from "next/link";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { StoredPing } from "@/lib/festival/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function PingRow({ ping }: { ping: StoredPing }) {
  const row = (
    <div className={[
      "flex items-start gap-3 px-4 py-3 border-b",
      ping.urgent ? "border-bonti-red/40" : "border-black/5",
      ping.read ? "opacity-70" : "bg-bonti-surface",
    ].join(" ")}>
      <BontiAvatar size="sm" animated={false} />
      <div className="flex-1 min-w-0">
        <p className={[
          "font-sofia uppercase text-xs tracking-wide truncate",
          ping.urgent ? "text-bonti-red" : "text-bonti-text",
        ].join(" ")}>
          {ping.title}
        </p>
        <p className="text-bonti-text font-roboto text-sm truncate">{ping.body}</p>
      </div>
      <span className="text-bonti-text/50 text-xs font-roboto">
        {formatTime(ping.received_at)}
      </span>
    </div>
  );
  return ping.deeplink ? <Link href={ping.deeplink}>{row}</Link> : row;
}
```

- [ ] **Step 4: Run lint to catch React 19 set-state-in-effect errors**

```bash
cd bonti && pnpm lint
```

Expected: PASS, no `react-hooks/set-state-in-effect` errors. (The `if (ping && ping.id !== lastPingId) { setLastPingId(ping.id); setShown(true); }` in PingToast is the render-time state derivation pattern, not a useEffect — already correct.)

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/components/global-ping-toast.tsx bonti/src/components/ping-toast.tsx bonti/src/components/ping-row.tsx
git commit -m "feat(ping): silent suppression + urgent styling for broadcasts"
```

---

## Task 5: `useBroadcastsRealtime` hook + tests

**Files:**
- Create: `bonti/src/hooks/use-broadcasts-realtime.ts`
- Test: `bonti/tests/unit/use-broadcasts-realtime.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/unit/use-broadcasts-realtime.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { BroadcastRow } from "@/lib/festival/broadcast-to-ping";

const mockRows: BroadcastRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    final_en: "Hist EN", final_ro: "Hist RO",
    title_en: "Hist", title_ro: "Hist",
    deeplink: null, target_venue_id: null,
    urgency: "standard",
    sent_at: "2026-07-18T19:45:00+03:00",
  },
];

let onInsertHandler: ((payload: { new: BroadcastRow }) => void) | null = null;

// Mock the supabase browser client BEFORE importing the hook.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => Promise.resolve({ data: mockRows, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: (_event: string, _opts: unknown, cb: (p: { new: BroadcastRow }) => void) => {
        onInsertHandler = cb;
        return {
          subscribe: () => ({ unsubscribe: vi.fn() }),
        };
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

// Use a fresh store per test to avoid cross-test bleed.
const appendPingMock = vi.fn();
vi.mock("@/lib/festival/store", () => ({
  useFestivalStore: Object.assign(
    (selector: (s: { appendPing: typeof appendPingMock }) => unknown) =>
      selector({ appendPing: appendPingMock }),
    { getState: () => ({ appendPing: appendPingMock }) },
  ),
}));

import { useBroadcastsRealtime } from "@/hooks/use-broadcasts-realtime";

describe("useBroadcastsRealtime", () => {
  beforeEach(() => {
    appendPingMock.mockClear();
    onInsertHandler = null;
  });

  it("hydrates from SELECT on mount with silent: true", async () => {
    renderHook(() => useBroadcastsRealtime({ lang: "ro" }));
    // Wait a microtask for the SELECT promise to resolve.
    await act(async () => { await Promise.resolve(); });
    expect(appendPingMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "broadcast-00000000-0000-0000-0000-000000000001" }),
      { silent: true },
    );
  });

  it("forwards live Realtime INSERTs without silent flag", async () => {
    renderHook(() => useBroadcastsRealtime({ lang: "ro" }));
    await act(async () => { await Promise.resolve(); });
    appendPingMock.mockClear();

    expect(onInsertHandler).not.toBeNull();
    act(() => {
      onInsertHandler!({
        new: {
          id: "22222222-2222-2222-2222-222222222222",
          final_en: "Live EN", final_ro: "Live RO",
          title_en: "Live", title_ro: "Live",
          deeplink: null, target_venue_id: null,
          urgency: "standard",
          sent_at: "2026-07-18T22:10:00+03:00",
        },
      });
    });

    expect(appendPingMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "broadcast-22222222-2222-2222-2222-222222222222" }),
      undefined,
    );
  });
});
```

- [ ] **Step 2: Install `@testing-library/react` and `jsdom` if missing**

The hook test uses `renderHook` which requires `@testing-library/react`. Check `package.json` first:

```bash
cd bonti && grep "@testing-library/react\|jsdom" package.json
```

If both are absent, install:

```bash
cd bonti && pnpm add -D @testing-library/react@^16 jsdom@^25
```

The `// @vitest-environment jsdom` directive is already on the first line of the test file from Step 1 — no further config needed.

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd bonti && pnpm test use-broadcasts-realtime
```

Expected: FAIL with "Cannot find module '@/hooks/use-broadcasts-realtime'".

- [ ] **Step 4: Write the hook**

Write `bonti/src/hooks/use-broadcasts-realtime.ts`:

```ts
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFestivalStore } from "@/lib/festival/store";
import { broadcastToPing, type BroadcastRow } from "@/lib/festival/broadcast-to-ping";

export function useBroadcastsRealtime({ lang }: { lang: "en" | "ro" }): void {
  useEffect(() => {
    const supabase = createClient();
    const appendPing = useFestivalStore.getState().appendPing;
    let cancelled = false;

    // 1) Hydrate from last 12h.
    (async () => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("broadcasts")
        .select("id, final_en, final_ro, title_en, title_ro, deeplink, target_venue_id, urgency, sent_at")
        .gte("sent_at", since)
        .order("sent_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn("[broadcasts] hydrate failed:", error.message);
        return;
      }
      for (const row of (data ?? []) as BroadcastRow[]) {
        appendPing(broadcastToPing(row, lang), { silent: true });
      }
    })();

    // 2) Subscribe to live INSERTs.
    const channel = supabase
      .channel("bonti-broadcasts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload: { new: BroadcastRow }) => {
          appendPing(broadcastToPing(payload.new, lang));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [lang]);
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd bonti && pnpm test use-broadcasts-realtime
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

Run from outer repo root:

```bash
git add bonti/src/hooks/use-broadcasts-realtime.ts bonti/tests/unit/use-broadcasts-realtime.test.ts bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(realtime): useBroadcastsRealtime hook with hydrate + INSERT subscribe"
```

---

## Task 6: Mount hook in `/app` layout, retire `SEEDED_BROADCASTS`, update `LiveTicker`

**Files:**
- Modify: `bonti/src/app/app/layout.tsx`
- Modify: `bonti/src/components/live-ticker.tsx`
- Modify: `bonti/src/data/festival-state.ts`

- [ ] **Step 1: Create a mount component for the hook**

Create `bonti/src/components/broadcasts-realtime-mount.tsx`:

```tsx
"use client";

import { useBroadcastsRealtime } from "@/hooks/use-broadcasts-realtime";

export function BroadcastsRealtimeMount({ lang }: { lang: "en" | "ro" }) {
  useBroadcastsRealtime({ lang });
  return null;
}
```

- [ ] **Step 2: Mount it in the `/app` layout**

Update `bonti/src/app/app/layout.tsx`:

```tsx
import { AppTabbar } from "@/components/app-tabbar";
import { GlobalPingToast } from "@/components/global-ping-toast";
import { BontiChatFAB } from "@/components/bonti-chat-fab";
import { BroadcastsRealtimeMount } from "@/components/broadcasts-realtime-mount";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      <main className="flex-1 mx-auto w-full max-w-[480px]">{children}</main>
      <div className="mx-auto w-full max-w-[480px]">
        <AppTabbar />
      </div>
      <BroadcastsRealtimeMount lang="ro" />
      <GlobalPingToast />
      <BontiChatFAB />
    </div>
  );
}
```

`lang="ro"` is hardcoded for Maria's demo persona (deferred to user-pref in Plan 3b — see spec §7).

- [ ] **Step 3: Update `LiveTicker` to read from the store**

Rewrite `bonti/src/components/live-ticker.tsx`:

```tsx
"use client";

import { useFestivalStore } from "@/lib/festival/store";

export function LiveTicker({ lang: _lang }: { lang: "en" | "ro" }) {
  const latest = useFestivalStore(s => {
    // Pick the most recent broadcast-prefixed ping by fires_at desc.
    const broadcasts = s.pings.filter(p => p.id.startsWith("broadcast-"));
    if (broadcasts.length === 0) return null;
    return broadcasts.reduce((best, p) =>
      new Date(p.fires_at) > new Date(best.fires_at) ? p : best,
    );
  });

  if (!latest) {
    return (
      <div className="mx-4 mt-4 mb-2 bg-bonti-toolbar/60 text-white text-xs font-roboto rounded-md px-3 py-2 truncate">
        <span className="opacity-60 mr-2">LIVE</span>
        Live updates appear here.
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 mb-2 bg-bonti-toolbar text-white text-xs font-roboto rounded-md px-3 py-2 truncate">
      <span className="opacity-60 mr-2">LIVE</span>
      {latest.body}
    </div>
  );
}
```

Note: the body of the ping is what was historically the broadcast `final_*` text. The unused `_lang` prop is kept for API-compat with the call site in `app/app/page.tsx` (`<LiveTicker lang="en" />`) — locale is already baked into the store ping by `useBroadcastsRealtime`.

- [ ] **Step 4: Remove `SEEDED_BROADCASTS` from `festival-state.ts`**

Edit `bonti/src/data/festival-state.ts` — delete the entire `SEEDED_BROADCASTS` export (lines 69-80 in the current file):

```ts
// DELETE this block:
export const SEEDED_BROADCASTS: { ts: string; en: string; ro: string }[] = [
  { ts: "2026-07-18T19:45:00+03:00", en: "...", ro: "..." },
  { ts: "2026-07-18T20:30:00+03:00", en: "Booha set running 10 min late.", ro: "Booha întârzie 10 minute." },
];
```

Leave the rest of the file (`Persona`, `SeededPing`, `DEMO_NOW`, `MARIA`, `FRIENDS`, `SEEDED_PINGS`, `LIVE_GLASS_ANIMALS_PING`) intact.

- [ ] **Step 5: Run typecheck + lint**

```bash
cd bonti && pnpm lint && pnpm tsc --noEmit
```

Expected: PASS. If any file still imports `SEEDED_BROADCASTS`, fix it (only `live-ticker.tsx` did — we just rewrote it).

- [ ] **Step 6: Run all tests to verify nothing regressed**

```bash
cd bonti && pnpm test
```

Expected: PASS — all existing + new tests green.

- [ ] **Step 7: Commit**

Run from outer repo root:

```bash
git add bonti/src/app/app/layout.tsx bonti/src/components/live-ticker.tsx bonti/src/components/broadcasts-realtime-mount.tsx bonti/src/data/festival-state.ts
git commit -m "feat(app): mount broadcasts realtime + live-ticker reads store + retire SEEDED_BROADCASTS"
```

---

## Task 7: `require-admin` server helper + tests

**Files:**
- Create: `bonti/src/lib/admin/require-admin.ts`
- Test: `bonti/tests/unit/require-admin.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/unit/require-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockGetUser },
  }),
}));

import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    process.env.ADMIN_EMAILS = "andrei.voic@rebeldot.com,other@example.com";
  });

  it("throws 401 when no session", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 401,
      message: "no_session",
    });
  });

  it("throws 403 when email not in allowlist", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "stranger@example.com" } },
      error: null,
    });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 403,
      message: "not_admin",
    });
  });

  it("returns user when allowlisted", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "andrei.voic@rebeldot.com" } },
      error: null,
    });
    const { user } = await requireAdmin();
    expect(user.email).toBe("andrei.voic@rebeldot.com");
  });

  it("throws 403 when ADMIN_EMAILS is unset (closed by default)", async () => {
    delete process.env.ADMIN_EMAILS;
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "andrei.voic@rebeldot.com" } },
      error: null,
    });
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 403,
      message: "not_admin",
    });
  });

  it("treats AdminAuthError as instanceof Error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    try {
      await requireAdmin();
    } catch (e) {
      expect(e).toBeInstanceOf(AdminAuthError);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test require-admin
```

Expected: FAIL with "Cannot find module '@/lib/admin/require-admin'".

- [ ] **Step 3: Write the helper**

Write `bonti/src/lib/admin/require-admin.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

export class AdminAuthError extends Error {
  readonly status: 401 | 403;
  constructor(message: "no_session" | "not_admin") {
    super(message);
    this.name = "AdminAuthError";
    this.status = message === "no_session" ? 401 : 403;
  }
}

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<{
  user: { id: string; email: string };
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new AdminAuthError("no_session");
  if (!allowlist().includes(user.email.toLowerCase())) {
    throw new AdminAuthError("not_admin");
  }
  return { user: { id: user.id, email: user.email } };
}

/** For API routes — returns a Response on auth failure, null on success. */
export async function requireAdminOrResponse(): Promise<{
  user: { id: string; email: string };
} | Response> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd bonti && pnpm test require-admin
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/lib/admin/require-admin.ts bonti/tests/unit/require-admin.test.ts
git commit -m "feat(admin): requireAdmin helper with ADMIN_EMAILS allowlist"
```

---

## Task 8: Draft prompt builder + zod schema

**Files:**
- Create: `bonti/src/lib/admin/draft-prompt.ts`
- Create: `bonti/src/lib/admin/draft-schema.ts`
- Test: `bonti/tests/unit/draft-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

Write `bonti/tests/unit/draft-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DraftResultSchema, extractDraftJson } from "@/lib/admin/draft-schema";

describe("draft schema", () => {
  it("accepts a valid bilingual draft", () => {
    const text = `{
      "title_en": "JT in 5",
      "body_en": "Justin Timberlake starts in 5 minutes at Main.",
      "title_ro": "JT in 5",
      "body_ro": "Justin Timberlake începe în 5 minute la Main."
    }`;
    const out = extractDraftJson(text);
    expect(out.title_en).toBe("JT in 5");
    expect(out.body_ro).toContain("Main");
  });

  it("strips markdown fences before parsing", () => {
    const text = "```json\n{\"title_en\":\"a\",\"body_en\":\"b\",\"title_ro\":\"c\",\"body_ro\":\"d\"}\n```";
    expect(() => extractDraftJson(text)).not.toThrow();
  });

  it("rejects when title exceeds 60 chars", () => {
    const longTitle = "x".repeat(61);
    expect(() =>
      DraftResultSchema.parse({
        title_en: longTitle, body_en: "ok",
        title_ro: "ok", body_ro: "ok",
      }),
    ).toThrow();
  });

  it("rejects when body exceeds 280 chars", () => {
    const longBody = "x".repeat(281);
    expect(() =>
      DraftResultSchema.parse({
        title_en: "ok", body_en: longBody,
        title_ro: "ok", body_ro: "ok",
      }),
    ).toThrow();
  });

  it("throws on completely non-JSON text", () => {
    expect(() => extractDraftJson("not json at all"))
      .toThrow(/No JSON object found/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test draft-schema
```

Expected: FAIL with "Cannot find module '@/lib/admin/draft-schema'".

- [ ] **Step 3: Write the schema**

Write `bonti/src/lib/admin/draft-schema.ts`:

```ts
import { z } from "zod";

export const DraftResultSchema = z.object({
  title_en: z.string().max(60),
  body_en: z.string().min(1).max(280),
  title_ro: z.string().max(60),
  body_ro: z.string().min(1).max(280),
});

export type DraftResult = z.infer<typeof DraftResultSchema>;

export function extractDraftJson(text: string): DraftResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in draft LLM response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return DraftResultSchema.parse(raw);
}
```

- [ ] **Step 4: Write the prompt builder**

Write `bonti/src/lib/admin/draft-prompt.ts`:

```ts
import { findVenueById } from "@/lib/festival/compass";

const BONTI_BROADCAST_VOICE = `
You are drafting a live broadcast for the official Electric Castle (EC) festival app, in Bonți's voice.

Style rules from EC's tone-of-voice research:
- Flat-informational register for logistics/alerts. Lead with the fact, not the greeting.
- Sensory and short. No urgency theater ("don't miss out", "act now", "epic").
- Romanian: tu/voi, never dumneavoastră. Plural "noi" when speaking as EC.
- Brand tokens stay English even in Romanian: Main, Hangar, Banffy, Booha, EC Village, line up-ul.
- Allowed Romanian idiom: "Ne vedem la festival", "Credem că...".
- ⚡ emoji acceptable as a single prefix character for critical updates only.

Output a JSON object with EXACTLY these fields and constraints:
{
  "title_en": "<<=60 chars, sentence-case, no trailing period>>",
  "body_en":  "<<=280 chars, one or two short sentences>>",
  "title_ro": "<<=60 chars>>",
  "body_ro":  "<<=280 chars>>"
}
No markdown fences. No prose before or after.
`.trim();

export function buildDraftPrompt(args: {
  source_text: string;
  target_venue_id: string | null;
  urgency: "standard" | "critical";
}): string {
  const venue = args.target_venue_id ? findVenueById(args.target_venue_id) : null;
  const venueLine = venue
    ? `Target venue: ${venue.name} (id=${venue.id}).`
    : `No specific venue target — this is a festival-wide broadcast.`;
  const urgencyLine = args.urgency === "critical"
    ? "URGENCY: critical. You may use the ⚡ emoji prefix in titles. Keep it short and direct."
    : "URGENCY: standard. Neutral tone, no urgency emoji.";

  return `${BONTI_BROADCAST_VOICE}

${venueLine}
${urgencyLine}

Source from EC ops (any language):
"""
${args.source_text}
"""

Draft the broadcast in both English and Romanian.`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd bonti && pnpm test draft-schema
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

Run from outer repo root:

```bash
git add bonti/src/lib/admin/draft-prompt.ts bonti/src/lib/admin/draft-schema.ts bonti/tests/unit/draft-schema.test.ts
git commit -m "feat(admin): draft prompt builder + bilingual schema"
```

---

## Task 9: `/api/admin/broadcast/draft` route + integration test

**Files:**
- Create: `bonti/src/app/api/admin/broadcast/draft/route.ts`
- Test: `bonti/tests/integration/admin-broadcast-draft-route.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/integration/admin-broadcast-draft-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
  AdminAuthError: class extends Error {
    status: number;
    constructor(message: string) { super(message); this.status = message === "no_session" ? 401 : 403; }
  },
}));

import { POST } from "@/app/api/admin/broadcast/draft/route";

describe("/api/admin/broadcast/draft", () => {
  beforeEach(() => { mockRequireAdmin.mockReset(); });

  it("returns 401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "JT starts in 5", urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not allowlisted", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("not_admin"));
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "JT starts in 5", urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 on missing source_text", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urgency: "standard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns a bilingual draft when authorized + valid (live LLM)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcast/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source_text: "Justin Timberlake starts in 5 min, head to Main",
        target_venue_id: "main_stage",
        urgency: "standard",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.title_en).toBe("string");
    expect(typeof body.body_en).toBe("string");
    expect(typeof body.title_ro).toBe("string");
    expect(typeof body.body_ro).toBe("string");
    expect(body.body_ro.length).toBeGreaterThan(0);
  }, 60_000);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test admin-broadcast-draft-route
```

Expected: FAIL with "Cannot find module '@/app/api/admin/broadcast/draft/route'".

- [ ] **Step 3: Write the route**

Write `bonti/src/app/api/admin/broadcast/draft/route.ts`:

```ts
import { z } from "zod";
import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { buildDraftPrompt } from "@/lib/admin/draft-prompt";
import { extractDraftJson } from "@/lib/admin/draft-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  source_text: z.string().min(1).max(280),
  target_venue_id: z.string().nullable().optional(),
  urgency: z.enum(["standard", "critical"]),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const prompt = buildDraftPrompt({
    source_text: body.source_text,
    target_venue_id: body.target_venue_id ?? null,
    urgency: body.urgency,
  });

  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxRetries: 0,
        abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error(`Empty from ${label}`);
      const draft = extractDraftJson(text);
      return Response.json(draft);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[admin/draft] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    JSON.stringify({ error: "draft_failed", detail: (lastErr as Error)?.message ?? "unknown" }),
    { status: 502, headers: { "content-type": "application/json" } },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd bonti && pnpm test admin-broadcast-draft-route
```

Expected: PASS (4 tests; the live-LLM one can take up to 60s).

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/app/api/admin/broadcast/draft/route.ts bonti/tests/integration/admin-broadcast-draft-route.test.ts
git commit -m "feat(admin): POST /api/admin/broadcast/draft with auth + fallback chain"
```

---

## Task 10: `/api/admin/broadcasts` POST + GET routes + integration tests

**Files:**
- Create: `bonti/src/app/api/admin/broadcasts/route.ts`
- Test: `bonti/tests/integration/admin-broadcasts-route.test.ts`

- [ ] **Step 1: Write the failing test**

Write `bonti/tests/integration/admin-broadcasts-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
  AdminAuthError: class extends Error {
    status: number;
    constructor(message: string) { super(message); this.status = message === "no_session" ? 401 : 403; }
  },
}));

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockGte = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        mockInsert(row);
        return {
          select: () => ({
            single: () => mockSingle(),
          }),
        };
      },
      select: (cols: string) => {
        mockSelect(cols);
        return {
          gte: (col: string, val: string) => {
            mockGte(col, val);
            return {
              order: (col2: string, opts: unknown) => {
                mockOrder(col2, opts);
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
    }),
  }),
}));

import { POST, GET } from "@/app/api/admin/broadcasts/route";

describe("/api/admin/broadcasts POST", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockInsert.mockReset();
    mockSingle.mockReset();
  });

  it("401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("400 on invalid body", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source_text: "x" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("200 on valid body and returns inserted id", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    mockSingle.mockResolvedValueOnce({
      data: { id: "33333333-3333-3333-3333-333333333333" },
      error: null,
    });
    const req = new Request("http://localhost/api/admin/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source_text: "JT starts in 5",
        title_en: "JT in 5",
        body_en: "Justin Timberlake starts in 5 min at Main.",
        title_ro: "JT în 5",
        body_ro: "Justin Timberlake începe în 5 min la Main.",
        urgency: "standard",
        target_venue_id: "main_stage",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("33333333-3333-3333-3333-333333333333");
    // Verify the insert row contained the mapped columns.
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_text: "JT starts in 5",
        final_en: "Justin Timberlake starts in 5 min at Main.",
        final_ro: "Justin Timberlake începe în 5 min la Main.",
        sent_by: "u1",
        target_venue_id: "main_stage",
      }),
    );
  });
});

describe("/api/admin/broadcasts GET", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockSelect.mockReset();
    mockGte.mockReset();
    mockOrder.mockReset();
  });

  it("401 when not signed in", async () => {
    const { AdminAuthError } = await import("@/lib/admin/require-admin");
    mockRequireAdmin.mockRejectedValueOnce(new AdminAuthError("no_session"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("200 returns broadcasts array (last 24h, sorted desc)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ user: { id: "u1", email: "a@b.c" } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.broadcasts)).toBe(true);
    expect(mockOrder).toHaveBeenCalledWith("sent_at", { ascending: false });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd bonti && pnpm test admin-broadcasts-route
```

Expected: FAIL with "Cannot find module '@/app/api/admin/broadcasts/route'".

- [ ] **Step 3: Write the route**

Write `bonti/src/app/api/admin/broadcasts/route.ts`:

```ts
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";

export const runtime = "nodejs";
export const maxDuration = 10;

const PostBodySchema = z.object({
  source_text: z.string().min(1).max(280),
  title_en: z.string().max(60).optional().default(""),
  body_en: z.string().min(1).max(280),
  title_ro: z.string().max(60).optional().default(""),
  body_ro: z.string().min(1).max(280),
  urgency: z.enum(["standard", "critical"]).default("standard"),
  target_venue_id: z.string().nullable().optional(),
  deeplink: z.string().nullable().optional(),
});

function unauthorized(e: AdminAuthError): Response {
  return new Response(JSON.stringify({ error: e.message }), {
    status: e.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  let user: { id: string; email: string };
  try {
    ({ user } = await requireAdmin());
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createAdminClient();
  const insertRow = {
    source_text: body.source_text,
    final_en: body.body_en,
    final_ro: body.body_ro,
    title_en: body.title_en,
    title_ro: body.title_ro,
    urgency: body.urgency,
    target_venue_id: body.target_venue_id ?? null,
    deeplink: body.deeplink ?? null,
    sent_by: user.id,
  };

  const { data, error } = await supabase
    .from("broadcasts")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/broadcasts] insert failed:", error.message);
    return new Response(JSON.stringify({ error: "insert_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ id: data.id });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("broadcasts")
    .select("id, source_text, final_en, final_ro, title_en, title_ro, urgency, target_venue_id, deeplink, sent_at")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: "select_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ broadcasts: data ?? [] });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd bonti && pnpm test admin-broadcasts-route
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/app/api/admin/broadcasts/route.ts bonti/tests/integration/admin-broadcasts-route.test.ts
git commit -m "feat(admin): POST/GET /api/admin/broadcasts with auth + service-role insert"
```

---

## Task 11: `/admin` layout (auth gate) + `/admin/sign-in` page

**Files:**
- Create: `bonti/src/app/admin/layout.tsx`
- Create: `bonti/src/app/admin/sign-in/page.tsx`

- [ ] **Step 1: Write the admin layout shell**

The layout is a thin shell with no auth gate — auth is enforced at the **page** level in Task 12. This keeps the sign-in page accessible without recursive redirects and avoids needing middleware to know the current pathname in a Next 16 layout.

Write `bonti/src/app/admin/layout.tsx`:

```tsx
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      <header className="bg-bonti-toolbar text-white px-4 h-[52px] flex items-center justify-between">
        <Link href="/admin/broadcasts" className="font-sofia uppercase tracking-wide">
          Bonți Ops
        </Link>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Write the sign-in page**

Write `bonti/src/app/admin/sign-in/page.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export default function AdminSignInPage() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin/broadcasts`,
      },
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h1 className="font-sofia uppercase text-bonti-text text-xl">Bonți Ops</h1>
      <p className="font-roboto text-bonti-text/70 text-sm text-center max-w-xs">
        Sign in with a Google account on the EC ops allowlist.
      </p>
      <button
        onClick={signIn}
        className="bg-bonti-red text-white font-sofia uppercase px-6 py-3 text-sm rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
```

The existing `/auth/callback` route already handles `next` param (it redirects there after code exchange) — verified at `bonti/src/app/auth/callback/route.ts`.

- [ ] **Step 3: Verify build passes**

```bash
cd bonti && pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run from outer repo root:

```bash
git add bonti/src/app/admin/layout.tsx bonti/src/app/admin/sign-in/page.tsx
git commit -m "feat(admin): /admin layout shell + Google OAuth sign-in"
```

---

## Task 12: `/admin/broadcasts` page + compose form + recent list

**Files:**
- Create: `bonti/src/app/admin/broadcasts/page.tsx`
- Create: `bonti/src/components/admin/broadcast-compose-form.tsx`
- Create: `bonti/src/components/admin/broadcast-recent-list.tsx`

- [ ] **Step 1: Write the page (server component with auth gate)**

Write `bonti/src/app/admin/broadcasts/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BroadcastComposeForm } from "@/components/admin/broadcast-compose-form";
import { BroadcastRecentList } from "@/components/admin/broadcast-recent-list";
import { VENUE } from "@/data/venue";

export default async function AdminBroadcastsPage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      if (e.status === 401) redirect("/admin/sign-in");
      return (
        <div className="text-center py-12">
          <h1 className="font-sofia uppercase text-bonti-red text-2xl mb-2">403</h1>
          <p className="font-roboto text-bonti-text">Your account is not authorized for Bonți Ops.</p>
        </div>
      );
    }
    throw e;
  }

  // Server-side initial load of recent broadcasts.
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("broadcasts")
    .select("id, title_en, title_ro, final_en, final_ro, urgency, sent_at")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  const venues = VENUE.map(v => ({ id: v.id, name: v.name }));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text mb-3">Compose</h2>
        <BroadcastComposeForm venues={venues} />
      </section>
      <section>
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text mb-3">Recent (last 24h)</h2>
        <BroadcastRecentList initial={recent ?? []} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the compose form**

Write `bonti/src/components/admin/broadcast-compose-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Venue = { id: string; name: string };
type Urgency = "standard" | "critical";

export function BroadcastComposeForm({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [targetVenue, setTargetVenue] = useState<string>("");
  const [urgency, setUrgency] = useState<Urgency>("standard");

  const [titleEn, setTitleEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [titleRo, setTitleRo] = useState("");
  const [bodyRo, setBodyRo] = useState("");

  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function draft() {
    setDraftErr(null);
    setDrafting(true);
    try {
      const res = await fetch("/api/admin/broadcast/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_text: sourceText,
          target_venue_id: targetVenue || null,
          urgency,
        }),
      });
      if (!res.ok) throw new Error(`Draft failed (${res.status})`);
      const d = await res.json();
      setTitleEn(d.title_en); setBodyEn(d.body_en);
      setTitleRo(d.title_ro); setBodyRo(d.body_ro);
    } catch (e) {
      setDraftErr((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  function send() {
    setSendMsg(null);
    startSend(async () => {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_text: sourceText,
          title_en: titleEn, body_en: bodyEn,
          title_ro: titleRo, body_ro: bodyRo,
          urgency,
          target_venue_id: targetVenue || null,
        }),
      });
      if (!res.ok) {
        setSendMsg(`Send failed (${res.status})`);
        return;
      }
      setSendMsg("Broadcast sent.");
      setSourceText(""); setTitleEn(""); setBodyEn(""); setTitleRo(""); setBodyRo("");
      setTargetVenue(""); setUrgency("standard");
      router.refresh();
    });
  }

  const canDraft = sourceText.trim().length > 0 && !drafting;
  const canSend = bodyEn.trim().length > 0 && bodyRo.trim().length > 0 && !sending;

  return (
    <div className="space-y-4 bg-white rounded-lg p-4 shadow-sm">
      <label className="block">
        <span className="font-roboto text-sm text-bonti-text/70">What happened?</span>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="e.g. Justin Timberlake starts in 5 min, head to Main"
          className="mt-1 w-full border border-black/10 rounded-md px-3 py-2 font-roboto text-sm"
        />
      </label>

      <div className="flex gap-3 items-end">
        <label className="flex-1">
          <span className="font-roboto text-xs text-bonti-text/70">Target venue</span>
          <select
            value={targetVenue}
            onChange={(e) => setTargetVenue(e.target.value)}
            className="mt-1 w-full border border-black/10 rounded-md px-2 py-2 font-roboto text-sm bg-white"
          >
            <option value="">(none — festival-wide)</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-3 items-center">
          <legend className="sr-only">Urgency</legend>
          <label className="font-roboto text-sm flex items-center gap-1">
            <input type="radio" checked={urgency === "standard"} onChange={() => setUrgency("standard")} />
            standard
          </label>
          <label className="font-roboto text-sm flex items-center gap-1 text-bonti-red">
            <input type="radio" checked={urgency === "critical"} onChange={() => setUrgency("critical")} />
            critical
          </label>
        </fieldset>
      </div>

      <button
        type="button"
        disabled={!canDraft}
        onClick={draft}
        className="bg-bonti-toolbar text-white font-sofia uppercase text-xs px-3 py-2 rounded disabled:opacity-50"
      >
        {drafting ? "Drafting…" : "✨ Draft with AI"}
      </button>
      {draftErr && (
        <p className="text-bonti-red text-xs font-roboto">Draft failed: {draftErr}. You can still send manually.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="border border-black/10 rounded-md p-3 space-y-2">
          <legend className="font-sofia uppercase text-xs text-bonti-text/70 px-1">EN</legend>
          <input
            value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Title (optional)" maxLength={60}
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
          <textarea
            value={bodyEn} onChange={(e) => setBodyEn(e.target.value)}
            rows={2} maxLength={280} placeholder="Body"
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
        </fieldset>
        <fieldset className="border border-black/10 rounded-md p-3 space-y-2">
          <legend className="font-sofia uppercase text-xs text-bonti-text/70 px-1">RO</legend>
          <input
            value={titleRo} onChange={(e) => setTitleRo(e.target.value)}
            placeholder="Titlu (opțional)" maxLength={60}
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
          <textarea
            value={bodyRo} onChange={(e) => setBodyRo(e.target.value)}
            rows={2} maxLength={280} placeholder="Corp"
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
        </fieldset>
      </div>

      <button
        type="button"
        disabled={!canSend}
        onClick={send}
        className={[
          "w-full font-sofia uppercase text-sm px-4 py-3 rounded text-white",
          urgency === "critical" ? "bg-bonti-red" : "bg-bonti-toolbar",
          "disabled:opacity-50",
        ].join(" ")}
      >
        {sending ? "Sending…" : "Send broadcast →"}
      </button>
      {sendMsg && <p className="font-roboto text-xs text-bonti-text">{sendMsg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Write the recent list**

Write `bonti/src/components/admin/broadcast-recent-list.tsx`:

```tsx
"use client";

type Row = {
  id: string;
  title_en: string;
  title_ro: string;
  final_en: string;
  final_ro: string;
  urgency: "standard" | "critical";
  sent_at: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function BroadcastRecentList({ initial }: { initial: Row[] }) {
  if (initial.length === 0) {
    return <p className="font-roboto text-sm text-bonti-text/60">No broadcasts in the last 24 hours.</p>;
  }
  return (
    <ul className="bg-white rounded-lg shadow-sm divide-y divide-black/5">
      {initial.map((r) => (
        <li key={r.id} className="px-4 py-2 flex items-baseline gap-3">
          <span className="font-roboto text-xs text-bonti-text/50 tabular-nums w-12">
            {formatTime(r.sent_at)}
          </span>
          <span className={[
            "font-sofia uppercase text-xs tracking-wide",
            r.urgency === "critical" ? "text-bonti-red" : "text-bonti-text",
          ].join(" ")}>
            {r.title_en || "Live update"}
          </span>
          <span className="font-roboto text-sm text-bonti-text/80 truncate">{r.final_en}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run lint + typecheck**

```bash
cd bonti && pnpm lint && pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run from outer repo root:

```bash
git add bonti/src/app/admin/broadcasts/page.tsx bonti/src/components/admin/broadcast-compose-form.tsx bonti/src/components/admin/broadcast-recent-list.tsx
git commit -m "feat(admin): /admin/broadcasts page with compose + AI draft + recent list"
```

---

## Task 13: Configure `ADMIN_EMAILS`, deploy, end-to-end smoke test

**Files:**
- Modify: `bonti/.env.local` (gitignored)
- Configure: Vercel production env

- [ ] **Step 1: Add `ADMIN_EMAILS` to local env**

Append to `bonti/.env.local`:

```
ADMIN_EMAILS=andrei.voic@rebeldot.com
```

Verify it's still gitignored:

```bash
cd bonti && git check-ignore .env.local
```

Expected: `.env.local` (printed back, confirming it's ignored).

- [ ] **Step 2: Add `ADMIN_EMAILS` to Vercel production**

```bash
cd bonti && echo "andrei.voic@rebeldot.com" | vercel env add ADMIN_EMAILS production
```

Expected: "Added Environment Variable ADMIN_EMAILS to Project bonti".

- [ ] **Step 3: Run full test suite locally**

```bash
cd bonti && pnpm test
```

Expected: PASS — all unit + integration tests green.

- [ ] **Step 4: Run local dev server and exercise the admin flow**

```bash
cd bonti && pnpm dev
```

Then in another terminal (or browser):

1. Open `http://localhost:3000/app` in tab A. Verify:
   - Page loads
   - Live ticker shows "⚡ Drumul înapoi e plin după Timberlake" (the most recent seeded broadcast, in RO since Maria's locale is hardcoded `ro`)
   - `/app/notifications` shows the 4 seeded pings + 2 broadcast pings (6 total)

2. Open `http://localhost:3000/admin/broadcasts` in tab B. Should redirect to `/admin/sign-in` (no session). Sign in with the allowlisted Google account.

3. After redirect back to `/admin/broadcasts`:
   - "Recent" list shows the 2 seeded broadcasts
   - Compose form is visible

4. In compose form: type "Justin Timberlake starts in 5 min, head to Main", pick "Main Stage" venue, urgency "standard", click "✨ Draft with AI". Wait ~3s. Verify EN/RO drafts populate.

5. Click "Send broadcast". Verify "Broadcast sent." message and the form clears. "Recent" list refreshes with the new entry.

6. Switch to tab A within ~2s. Verify:
   - A toast slides in from the top with the RO title + body
   - The live ticker headline updates to the new broadcast body
   - `/app/notifications` shows the new broadcast at the top

7. Tap the toast → routes to `/app/compass?target=main_stage`. Verify the compass arrow points to Main Stage.

If any of the above fails, debug before proceeding.

- [ ] **Step 5: Deploy to Vercel production**

```bash
cd bonti && vercel --prod
```

Expected: deployment URL printed (typically `https://bonti-ten.vercel.app`).

- [ ] **Step 6: Production smoke test**

Repeat the manual flow from Step 4 against the production URL:

1. `https://bonti-ten.vercel.app/app` — load, verify live ticker
2. `https://bonti-ten.vercel.app/admin/broadcasts` — sign-in flow
3. Compose + Draft + Send → toast arrives on the `/app` tab

- [ ] **Step 7: Commit + tag**

The `.env.local` change is gitignored so nothing to commit there. Only thing to commit is the deploy marker if you want one — otherwise skip.

If a marker is useful, run from outer repo root:

```bash
git commit --allow-empty -m "deploy: bonti live broadcasts (Plan 3a) shipped"
```

---

## Spec coverage check

| Spec section | Implementing task(s) |
|---|---|
| §1 Goal — broadcast in ~1s | Tasks 5, 6, 9-12, manual verification in 13 |
| §2 Architecture — admin → API → broadcasts → Realtime → /app | Tasks 5, 6, 10, 12 |
| §3.1 Existing broadcasts table | (no change, just used) |
| §3.2 Title/deeplink columns + RLS migration | Task 1 |
| §3.3 Seed migration | Task 1 |
| §3.4 broadcast-to-ping mapper | Task 2 |
| §4.1 /admin/broadcasts surface | Tasks 11, 12 |
| §4.2 /app surface — useBroadcastsRealtime + ticker + toast/row urgent | Tasks 4, 5, 6 |
| §4.3 API routes — /draft, POST/GET /broadcasts | Tasks 9, 10 |
| §5.1 Auth gate + ADMIN_EMAILS allowlist | Tasks 7, 11, 12, 13 |
| §5.2 Realtime resilience (auto-reconnect + re-hydration) | Task 5 (Supabase client built-in) |
| §5.3 LLM draft failure handling | Task 9 (fallback chain) + Task 12 (inline error UI) |
| §5.4 Validation (zod everywhere) | Tasks 8, 9, 10 |
| §5.5 Replay edge cases — silent flag, dedupe | Tasks 3, 5 |
| §5.6 RLS audit | Task 1 |
| §5.7 Test coverage table | Tasks 2, 3, 5, 7-10 |
| §5.8 Secrets posture | Task 13 |
| §6 Demo orchestration | Task 13 (manual flow) |
| §7 Out of scope | (none — deferred to 3b) |
| §8 Handoff contract to 3b | (none — stable types from Tasks 2, 5 ensure no breaking changes) |
| §9 File inventory | Tasks 1-12 collectively cover all listed files |

No gaps.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-bonti-live-broadcasts.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, spec-compliance review + code-quality review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
