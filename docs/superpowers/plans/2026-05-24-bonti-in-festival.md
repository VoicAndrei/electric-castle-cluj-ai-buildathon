# Bonți — In-Festival Surface (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all six `/app/*` surfaces — home, compass, group meet-up, notifications, lineup-with-music-match-overlay, and wait times — as a mobile-first PWA-shell experience for the in-festival side of Bonți.

**Architecture:** A new `/app/*` route tree wrapped in a mobile shell (header strip + bottom tab bar) replaces the pre-ticket `<BontiHeader>`. Festival state lives in a Zustand store seeded from `bonti/src/data/festival-state.ts` and persisted to a cookie. Three new LLM JSON routes (`/api/compass`, `/api/group/converge`, `/api/lineup/blurb`) mirror the `match-llm.ts` buffered-`generateText` + JSON-extract pattern. Stylized SVG of the venue replaces any real map. Bonți's avatar becomes the EC inflatable duck.

**Tech Stack:** Same as Plan 0/1 — Next.js 16, Tailwind v4, shadcn/ui, Framer Motion, Supabase, OpenRouter via Vercel AI SDK, vitest, zod. New deps: **zustand** for store, **@lottiefiles/react-lottie-player** (or just `lottie-react`) for the animated duck if a Lottie asset is sourced.

**Spec:** `docs/superpowers/specs/2026-05-24-bonti-in-festival-design.md`. This plan implements that spec end-to-end.

**Out of scope (explicitly):** admin CMS, real-time broadcast wiring, insights dashboard (all Plan 3); service worker / offline cache (deferred — video backup is the real safety net for demo failures); push notification permissions (not needed for the in-festival UI surface).

---

## File Structure

```
bonti/
  public/
    bonti-duck.json                   NEW — Lottie animation (sourced; CC0/permissive)
    bonti-duck.svg                    NEW — SVG fallback
    icons/
      bonti-32.png                    NEW — favicon, duck head
      bonti-180.png                   NEW — apple-touch-icon
      bonti-192.png                   NEW — manifest icon
      bonti-512.png                   NEW — manifest icon
    manifest.json                     NEW — PWA manifest
  src/
    components/
      bonti-avatar.tsx                NEW — duck component, all sizes
      app-header.tsx                  NEW — full-bleed header strip for /app/*
      app-tabbar.tsx                  NEW — bottom tab bar for /app/*
      bonti-chat-fab.tsx              NEW — floating chat button on subpages
      venue-map.tsx                   NEW — stylized SVG of EC grounds
      compass-card.tsx                NEW — arrow + distance + bonti line
      ping-row.tsx                    NEW — single notification row
      ping-toast.tsx                  NEW — slide-in toast
      lineup-row.tsx                  NEW — artist row with overlay pill
      density-bar.tsx                 NEW — horizontal density meter
    data/
      venue.ts                        NEW — venue catalog
      festival-state.ts               NEW — seeded personas, pings, broadcasts, DEMO_NOW
    lib/
      festival/
        store.ts                      NEW — Zustand store + cookie persist
        compass.ts                    NEW — distance/bearing math, venue formatter
        converge.ts                   NEW — group positions formatter
        prompts.ts                    NEW — system prompts for in-festival routes
      prompts/
        bonti-system.ts               MODIFY — add buildBontiInFestivalSystemPrompt
    app/
      layout.tsx                      MODIFY — add viewport/apple-mobile meta
      app/
        layout.tsx                    NEW — mobile shell wrapping /app/*
        page.tsx                      NEW — home
        compass/
          page.tsx                    NEW
        group/
          page.tsx                    NEW
        notifications/
          page.tsx                    NEW
        lineup/
          page.tsx                    NEW
        wait-times/
          page.tsx                    NEW
      api/
        chat/
          route.ts                    MODIFY — accept mode + in-festival prompt
        compass/
          route.ts                    NEW
        group/
          converge/
            route.ts                  NEW
        lineup/
          blurb/
            route.ts                  NEW
  docs/ingest/
    lineup.json                       MODIFY — expand to 24+ artists across 3 days
  tests/
    unit/
      festival-store.test.ts          NEW
      compass-math.test.ts            NEW
      compass-schema.test.ts          NEW
      converge-schema.test.ts         NEW
      blurb-cache.test.ts             NEW
    integration/
      compass-route.test.ts           NEW
      group-converge-route.test.ts    NEW
      lineup-blurb-route.test.ts      NEW
```

---

### Task 1: Duck avatar asset + `<BontiAvatar>` component + favicon

**Files:**
- Create: `bonti/public/bonti-duck.svg`
- Create: `bonti/public/icons/bonti-32.png`, `bonti-180.png`, `bonti-192.png`, `bonti-512.png`
- Create: `bonti/src/components/bonti-avatar.tsx`
- Modify: `bonti/src/app/layout.tsx` — add `icons` field on `metadata`

- [ ] **Step 1: Hand-author the duck SVG (yellow body, orange bill, cartoon eyes)**

Create `bonti/public/bonti-duck.svg`. Single-color, scalable, no shadows. Roughly 200×200 viewBox.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <!-- body -->
  <ellipse cx="100" cy="135" rx="78" ry="55" fill="#F2D43A"/>
  <!-- head -->
  <circle cx="100" cy="72" r="50" fill="#F2D43A"/>
  <!-- bill (upper) -->
  <ellipse cx="110" cy="88" rx="28" ry="10" fill="#E97A24"/>
  <!-- bill (lower lip line) -->
  <ellipse cx="110" cy="93" rx="22" ry="3" fill="#C75E13"/>
  <!-- left eye white -->
  <ellipse cx="84" cy="62" rx="11" ry="13" fill="#FFFFFF"/>
  <!-- right eye white -->
  <ellipse cx="110" cy="62" rx="11" ry="13" fill="#FFFFFF"/>
  <!-- left pupil -->
  <circle cx="83" cy="63" r="6" fill="#0A0A0A"/>
  <!-- right pupil -->
  <circle cx="109" cy="63" r="6" fill="#0A0A0A"/>
</svg>
```

- [ ] **Step 2: Generate raster icons from the SVG**

Use any tool you prefer (sharp, ImageMagick, or open the SVG in a browser/Preview and export). Output four PNGs to `bonti/public/icons/`:
- `bonti-32.png` (32×32) — favicon
- `bonti-180.png` (180×180) — apple-touch-icon
- `bonti-192.png` (192×192) — manifest
- `bonti-512.png` (512×512) — manifest

Quick way via `sharp` (already a transitive dep through Next):

```bash
cd bonti
node -e "const sharp=require('sharp'); const fs=require('fs'); const sizes=[32,180,192,512]; const svg=fs.readFileSync('public/bonti-duck.svg'); Promise.all(sizes.map(s=>sharp(svg).resize(s,s).png().toFile(\`public/icons/bonti-\${s}.png\`))).then(()=>console.log('ok'))"
```

- [ ] **Step 3: Create the `<BontiAvatar>` component**

Create `bonti/src/components/bonti-avatar.tsx`:

```tsx
import Image from "next/image";

type Size = "sm" | "md" | "lg" | "xl";

const PX: Record<Size, number> = { sm: 32, md: 48, lg: 72, xl: 128 };

export function BontiAvatar({
  size = "md",
  className,
  animated = true,
}: {
  size?: Size;
  className?: string;
  animated?: boolean;
}) {
  const px = PX[size];
  return (
    <span
      className={["inline-block shrink-0", animated ? "animate-bonti-bob" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: px, height: px }}
      aria-label="Bonți"
      role="img"
    >
      <Image
        src="/bonti-duck.svg"
        alt=""
        width={px}
        height={px}
        priority
        draggable={false}
      />
    </span>
  );
}
```

- [ ] **Step 4: Define the idle-bob animation in `globals.css`**

Append to `bonti/src/app/globals.css` (anywhere after `@theme`):

```css
@keyframes bonti-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
.animate-bonti-bob {
  animation: bonti-bob 2.2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-bonti-bob { animation: none; }
}
```

- [ ] **Step 5: Wire favicon + apple-touch-icon in root metadata**

Modify `bonti/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonți — Electric Castle 2026",
  description: "Your EC friend. From 'should I even go?' to dancing at the right stage.",
  icons: {
    icon: "/icons/bonti-32.png",
    apple: "/icons/bonti-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Drop the existing `favicon.ico`**

```bash
git rm bonti/src/app/favicon.ico
```

- [ ] **Step 7: Visual smoke test in dev**

```bash
cd bonti && pnpm dev
```

Open `http://localhost:3000`. Tab favicon should be the duck. View source — `<link rel="icon">` points at `/icons/bonti-32.png`. Idle bob plays subtly when you place `<BontiAvatar />` anywhere.

- [ ] **Step 8: Commit**

```bash
git add bonti/public/bonti-duck.svg bonti/public/icons/ bonti/src/components/bonti-avatar.tsx bonti/src/app/layout.tsx bonti/src/app/globals.css
git rm bonti/src/app/favicon.ico
git commit -m "feat(brand): duck avatar component + favicon"
```

---

### Task 2: Festival data — `venue.ts` + `festival-state.ts`

**Files:**
- Create: `bonti/src/data/venue.ts`
- Create: `bonti/src/data/festival-state.ts`

- [ ] **Step 1: Create the venue catalog**

Create `bonti/src/data/venue.ts`:

```ts
export type VenueKind =
  | "stage" | "beer" | "food" | "bathroom"
  | "beach" | "campsite" | "village" | "shuttle" | "first_aid";

export type VenuePoint = {
  id: string;
  name: string;
  kind: VenueKind;
  coords: { x: number; y: number };
  ec_tag?: string;
  lineProbability?: "low" | "med" | "high";
  queueState?: { density: "low" | "med" | "high"; estimateMin: number };
  bonti_blurb?: string;
};

export const METERS_PER_UNIT = 0.4;

export const VENUE: VenuePoint[] = [
  // Stages (laid out roughly like EC's actual venue topology)
  { id: "main_stage",    name: "Main Stage",    kind: "stage", coords: { x: 500, y: 320 }, ec_tag: "main",   bonti_blurb: "Biggest crowd, best for headliners." },
  { id: "hangar_stage",  name: "Hangar Stage",  kind: "stage", coords: { x: 700, y: 480 }, ec_tag: "hangar", bonti_blurb: "Indoor, electronic, gets loud after midnight." },
  { id: "booha_stage",   name: "Booha Stage",   kind: "stage", coords: { x: 360, y: 560 }, ec_tag: "booha",  bonti_blurb: "Smaller, weirder, the discovery stage." },
  { id: "banffy_stage",  name: "Banffy Castle", kind: "stage", coords: { x: 500, y: 200 }, ec_tag: "banffy", bonti_blurb: "Inside the castle. Strings and atmosphere." },
  { id: "beach_stage",   name: "The Beach",     kind: "beach", coords: { x: 220, y: 740 }, ec_tag: "beach",  bonti_blurb: "Sand, lake, beats. Recovery zone." },

  // Beer
  { id: "beer_garden_n", name: "Beer Garden North", kind: "beer", coords: { x: 540, y: 380 }, lineProbability: "low",  bonti_blurb: "Closest to Main. Always moves fast." },
  { id: "beer_garden_s", name: "Beer Garden South", kind: "beer", coords: { x: 460, y: 600 }, lineProbability: "med",  bonti_blurb: "Between Booha and food. Crowded around set times." },
  { id: "beer_hangar",   name: "Beer @ Hangar",     kind: "beer", coords: { x: 740, y: 500 }, lineProbability: "high", bonti_blurb: "Long lines after midnight." },

  // Food
  { id: "food_court",    name: "Food Court",     kind: "food", coords: { x: 480, y: 660 }, lineProbability: "med", bonti_blurb: "Most options. Pizza line is fastest." },
  { id: "burger_truck",  name: "Burger Truck",   kind: "food", coords: { x: 620, y: 640 }, lineProbability: "high" },
  { id: "vegan_corner",  name: "Vegan Corner",   kind: "food", coords: { x: 420, y: 700 }, lineProbability: "low" },

  // Bathrooms
  { id: "wc_main",       name: "Bathrooms · Main",    kind: "bathroom", coords: { x: 460, y: 360 }, lineProbability: "high" },
  { id: "wc_hangar",     name: "Bathrooms · Hangar",  kind: "bathroom", coords: { x: 760, y: 460 }, lineProbability: "med" },
  { id: "wc_campsite_c", name: "Bathrooms · Block C", kind: "bathroom", coords: { x: 820, y: 760 }, lineProbability: "low" },

  // Campsite blocks
  { id: "camp_a",        name: "Campsite Block A", kind: "campsite", coords: { x: 760, y: 720 } },
  { id: "camp_b",        name: "Campsite Block B", kind: "campsite", coords: { x: 820, y: 720 } },
  { id: "camp_c",        name: "Campsite Block C", kind: "campsite", coords: { x: 820, y: 760 } },

  // Village + misc
  { id: "ec_village",    name: "EC Village",  kind: "village", coords: { x: 600, y: 720 }, bonti_blurb: "Slow zone. Coffee, hammocks, weird talks." },
  { id: "shuttle_drop",  name: "Shuttle Drop", kind: "shuttle", coords: { x: 120, y: 880 } },
  { id: "first_aid",     name: "First Aid",    kind: "first_aid", coords: { x: 540, y: 420 } },
];

// Default seeded queue snapshots (mutable in implementation; cycled by /app/wait-times refresh)
export const QUEUE_SNAPSHOTS: Record<string, { density: "low" | "med" | "high"; estimateMin: number }>[] = [
  {
    beer_garden_n: { density: "low",  estimateMin: 3 },
    beer_garden_s: { density: "med",  estimateMin: 7 },
    beer_hangar:   { density: "high", estimateMin: 14 },
    food_court:    { density: "med",  estimateMin: 8 },
    burger_truck:  { density: "high", estimateMin: 12 },
    vegan_corner:  { density: "low",  estimateMin: 4 },
    wc_main:       { density: "high", estimateMin: 6 },
    wc_hangar:     { density: "med",  estimateMin: 3 },
    wc_campsite_c: { density: "low",  estimateMin: 1 },
  },
  {
    beer_garden_n: { density: "med",  estimateMin: 5 },
    beer_garden_s: { density: "high", estimateMin: 11 },
    beer_hangar:   { density: "high", estimateMin: 16 },
    food_court:    { density: "high", estimateMin: 13 },
    burger_truck:  { density: "high", estimateMin: 18 },
    vegan_corner:  { density: "med",  estimateMin: 7 },
    wc_main:       { density: "high", estimateMin: 9 },
    wc_hangar:     { density: "med",  estimateMin: 4 },
    wc_campsite_c: { density: "low",  estimateMin: 2 },
  },
  {
    beer_garden_n: { density: "low",  estimateMin: 2 },
    beer_garden_s: { density: "low",  estimateMin: 4 },
    beer_hangar:   { density: "med",  estimateMin: 8 },
    food_court:    { density: "med",  estimateMin: 6 },
    burger_truck:  { density: "med",  estimateMin: 9 },
    vegan_corner:  { density: "low",  estimateMin: 3 },
    wc_main:       { density: "med",  estimateMin: 4 },
    wc_hangar:     { density: "low",  estimateMin: 2 },
    wc_campsite_c: { density: "low",  estimateMin: 1 },
  },
];
```

- [ ] **Step 2: Create the festival state seed**

Create `bonti/src/data/festival-state.ts`:

```ts
export type Persona = {
  id: string;
  name: string;
  avatar_emoji: string;
  coords: { x: number; y: number };
  last_activity: string;
};

export type SeededPing = {
  id: string;
  fires_at: string; // ISO
  lang: "ro" | "en";
  title: string;
  body: string;
  deeplink?: string;
};

export const DEMO_NOW = new Date("2026-07-18T21:43:00+03:00"); // Saturday, EC

export const MARIA: Persona = {
  id: "maria",
  name: "Maria",
  avatar_emoji: "🦋",
  coords: { x: 540, y: 380 }, // at Beer Garden North
  last_activity: "at Beer Garden · just now",
};

export const FRIENDS: Persona[] = [
  { id: "alex",   name: "Alex",   avatar_emoji: "🐺", coords: { x: 360, y: 560 }, last_activity: "at Booha · 4 min ago" },
  { id: "ioana",  name: "Ioana",  avatar_emoji: "🦊", coords: { x: 500, y: 320 }, last_activity: "near Main · 2 min ago" },
  { id: "andrei", name: "Andrei", avatar_emoji: "🐻", coords: { x: 480, y: 660 }, last_activity: "at Food Court · 6 min ago" },
];

export const SEEDED_PINGS: SeededPing[] = [
  {
    id: "ping-beach-21-15",
    fires_at: "2026-07-18T21:15:00+03:00",
    lang: "en",
    title: "Beach Stage is empty right now",
    body: "4 min walk. Beer and sand.",
    deeplink: "/app/compass?target=beach_stage",
  },
  {
    id: "ping-alex-20-50",
    fires_at: "2026-07-18T20:50:00+03:00",
    lang: "en",
    title: "Alex pinged you",
    body: '"where r u"',
    deeplink: "/app/group",
  },
  {
    id: "ping-booha-20-30",
    fires_at: "2026-07-18T20:30:00+03:00",
    lang: "en",
    title: "Booha set running 10 min late",
    body: "Schedule slipped slightly.",
    deeplink: "/app/lineup",
  },
  {
    id: "ping-shuttle-19-45",
    fires_at: "2026-07-18T19:45:00+03:00",
    lang: "ro",
    title: "⚡ Drumul înapoi e plin după Timberlake",
    body: "Shuttle-ul revine la 3. Stai la festival.",
    deeplink: "/app/notifications",
  },
];

export const SEEDED_BROADCASTS: { ts: string; en: string; ro: string }[] = [
  {
    ts: "2026-07-18T19:45:00+03:00",
    en: "⚡ Road back is full after Timberlake. Shuttle's paused till 3. Stay at the festival — set at The Beach, after at Hangar.",
    ro: "⚡ Drumul înapoi e plin după Timberlake. Shuttle-ul revine la 3. Stai la festival — e un set la The Beach și un after la Hangar.",
  },
  {
    ts: "2026-07-18T20:30:00+03:00",
    en: "Booha set running 10 min late.",
    ro: "Booha întârzie 10 minute.",
  },
];

// The Glass Animals ping fired live 8s after /app mount uses DEMO_NOW + 8s as fires_at.
// Its body is built dynamically (so we can localize); the static template lives here.
export const LIVE_GLASS_ANIMALS_PING: Omit<SeededPing, "fires_at"> = {
  id: "ping-glass-animals-live",
  lang: "en",
  title: "Glass Animals in 10 min at Main",
  body: "Your match.",
  deeplink: "/app/compass?target=main_stage",
};
```

- [ ] **Step 3: Sanity-check by running typecheck**

```bash
cd bonti && pnpm tsc --noEmit
```

Expected: no errors. Adjust any type drift before committing.

- [ ] **Step 4: Commit**

```bash
git add bonti/src/data/venue.ts bonti/src/data/festival-state.ts
git commit -m "feat(festival): venue catalog + seeded state (maria, friends, pings, broadcasts)"
```

---

### Task 3: Festival store — Zustand + cookie persistence + tests

**Files:**
- Modify: `bonti/package.json` — add `zustand`
- Create: `bonti/src/lib/festival/store.ts`
- Create: `bonti/tests/unit/festival-store.test.ts`

- [ ] **Step 1: Install zustand**

```bash
cd bonti && pnpm add zustand
```

Verify it appears in `bonti/package.json` dependencies.

- [ ] **Step 2: Write the failing test**

Create `bonti/tests/unit/festival-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createFestivalStore, type FestivalStoreApi } from "@/lib/festival/store";
import { MARIA, FRIENDS, SEEDED_PINGS, LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

describe("festival store", () => {
  let store: FestivalStoreApi;

  beforeEach(() => {
    store = createFestivalStore();
  });

  it("seeds from festival-state defaults", () => {
    const s = store.getState();
    expect(s.maria.id).toBe(MARIA.id);
    expect(s.friends).toHaveLength(FRIENDS.length);
    expect(s.pings).toHaveLength(SEEDED_PINGS.length);
    expect(s.pings.every(p => p.read === false)).toBe(true);
  });

  it("appendPing adds with received_at and read=false", () => {
    const before = store.getState().pings.length;
    store.getState().appendPing({ ...LIVE_GLASS_ANIMALS_PING, fires_at: DEMO_NOW.toISOString() });
    const after = store.getState().pings;
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(LIVE_GLASS_ANIMALS_PING.id);
    expect(after[0].read).toBe(false);
    expect(after[0].received_at).toBeDefined();
  });

  it("markAllPingsRead flips every read flag", () => {
    store.getState().markAllPingsRead();
    expect(store.getState().pings.every(p => p.read === true)).toBe(true);
  });

  it("applyGroupConverge updates positions and stores meeting", () => {
    store.getState().applyGroupConverge({
      meeting_point_id: "banffy_stage",
      eta_min: 8,
      reason: "Banffy puts everyone within 5 min walk.",
      target_coords: { x: 500, y: 200 },
    });
    const s = store.getState();
    expect(s.group_meeting?.point_id).toBe("banffy_stage");
    expect(s.group_meeting?.eta_min).toBe(8);
    for (const f of s.friends) {
      expect(f.coords).toEqual({ x: 500, y: 200 });
    }
    expect(s.maria.coords).toEqual({ x: 500, y: 200 });
  });

  it("reset returns to seeded defaults", () => {
    store.getState().markAllPingsRead();
    store.getState().reset();
    expect(store.getState().pings.every(p => p.read === false)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to see it fail**

```bash
cd bonti && pnpm test tests/unit/festival-store.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/festival/store'".

- [ ] **Step 4: Implement the store**

Create `bonti/src/lib/festival/store.ts`:

```ts
import { create, type StoreApi } from "zustand";
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
  group_meeting?: { point_id: string; eta_min: number; reason: string };

  appendPing: (p: SeededPing) => void;
  applyGroupConverge: (r: GroupConvergeResult) => void;
  markAllPingsRead: () => void;
  reset: () => void;
};

export type FestivalStoreApi = StoreApi<FestivalState>;

const seed = (): Pick<FestivalState, "maria" | "friends" | "pings"> => ({
  maria: { ...MARIA },
  friends: FRIENDS.map(f => ({ ...f })),
  pings: SEEDED_PINGS.map(p => ({ ...p, read: false, received_at: p.fires_at })),
});

// Cookie-backed storage using document.cookie (24h TTL).
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24; // 24h
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
      (set, get) => ({
        ...seed(),

        appendPing: (p) =>
          set((state) => ({
            pings: [
              { ...p, read: false, received_at: new Date().toISOString() },
              ...state.pings,
            ],
          })),

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
        }),
      },
    ),
  );
}

// Module-level singleton for client components.
export const useFestivalStore = createFestivalStore();
```

- [ ] **Step 5: Run tests to see them pass**

```bash
cd bonti && pnpm test tests/unit/festival-store.test.ts
```

Expected: PASS, 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add bonti/package.json bonti/pnpm-lock.yaml bonti/src/lib/festival/store.ts bonti/tests/unit/festival-store.test.ts
git commit -m "feat(festival): zustand store with cookie persistence"
```

---

### Task 4: Mobile app shell — layout, header, tabbar, safe-area, PWA meta

**Files:**
- Create: `bonti/src/components/app-header.tsx`
- Create: `bonti/src/components/app-tabbar.tsx`
- Create: `bonti/src/app/app/layout.tsx`
- Create: `bonti/src/app/app/page.tsx` (placeholder)
- Modify: `bonti/src/app/layout.tsx` — add viewport + apple-mobile meta
- Modify: `bonti/src/app/globals.css` — safe-area helpers

- [ ] **Step 1: Add safe-area utility classes**

Append to `bonti/src/app/globals.css`:

```css
@layer utilities {
  .pt-safe { padding-top: env(safe-area-inset-top); }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
  .h-safe-top { height: env(safe-area-inset-top); }
  .h-safe-bottom { height: env(safe-area-inset-bottom); }
}
```

- [ ] **Step 2: Add viewport + apple-mobile metadata to root layout**

Modify `bonti/src/app/layout.tsx` — add `viewport` export and `apple-mobile-web-app-*` meta tags:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonți — Electric Castle 2026",
  description: "Your EC friend. From 'should I even go?' to dancing at the right stage.",
  icons: {
    icon: "/icons/bonti-32.png",
    apple: "/icons/bonti-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Bonți",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#EB0000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Build the `<AppHeader>` component**

Create `bonti/src/components/app-header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BontiAvatar } from "@/components/bonti-avatar";

type Props = {
  title: string;
  showBack?: boolean;
  unread?: number;
};

export function AppHeader({ title, showBack = false, unread = 0 }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-bonti-toolbar pt-safe">
      <div className="h-[52px] px-4 flex items-center justify-between">
        <div className="w-10 flex items-center">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="text-white/80 hover:text-white text-xl leading-none"
            >
              ‹
            </button>
          ) : (
            <Link href="/app" aria-label="Bonți home">
              <BontiAvatar size="sm" animated />
            </Link>
          )}
        </div>
        <h1 className="text-white text-base font-sofia uppercase tracking-wide truncate">
          {title}
        </h1>
        <div className="w-10 flex items-center justify-end">
          <Link href="/app/notifications" aria-label="Notifications" className="relative">
            <span className="text-white/80 hover:text-white">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 size-2 bg-bonti-red rounded-full" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Build the `<AppTabbar>` component**

Create `bonti/src/components/app-tabbar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app",               label: "Home",     icon: "🏰" },
  { href: "/app/compass",       label: "Compass",  icon: "🧭" },
  { href: "/app/group",         label: "Group",    icon: "👥" },
  { href: "/app/lineup",        label: "Lineup",   icon: "🎤" },
  { href: "/app/notifications", label: "Pings",    icon: "🔔" },
];

export function AppTabbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 bg-bonti-surface border-t border-black/5 pb-safe">
      <ul className="flex h-14">
        {TABS.map((t) => {
          const active =
            t.href === "/app" ? pathname === "/app" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={[
                  "h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-roboto uppercase tracking-wide",
                  active ? "text-bonti-red" : "text-bonti-text/60",
                ].join(" ")}
              >
                <span aria-hidden className="text-lg leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: Build the `/app` layout**

Create `bonti/src/app/app/layout.tsx`:

```tsx
import { AppTabbar } from "@/components/app-tabbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      {/* Header is rendered per-page so each page sets its own title */}
      <main className="flex-1 mx-auto w-full max-w-[480px]">{children}</main>
      <div className="mx-auto w-full max-w-[480px]">
        <AppTabbar />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Stub `/app/page.tsx` so the route resolves**

Create `bonti/src/app/app/page.tsx`:

```tsx
import { AppHeader } from "@/components/app-header";

export default function AppHome() {
  return (
    <>
      <AppHeader title="Bonți" />
      <div className="px-4 py-6 text-bonti-text font-roboto">
        Home placeholder. Replaced in Task 6.
      </div>
    </>
  );
}
```

- [ ] **Step 7: Visual smoke test**

```bash
cd bonti && pnpm dev
```

Open `http://localhost:3000/app`. Verify:
- Header strip is black with duck top-left, "BONȚI" centered, bell top-right
- Bottom tab bar with 5 tabs; "Home" active in red, others gray
- On mobile viewport (DevTools), no horizontal scroll
- Tab nav works: tapping Compass goes to `/app/compass` (returns 404 for now — fine)

- [ ] **Step 8: Commit**

```bash
git add bonti/src/components/app-header.tsx bonti/src/components/app-tabbar.tsx bonti/src/app/app/ bonti/src/app/layout.tsx bonti/src/app/globals.css
git commit -m "feat(app): mobile shell — header, tab bar, /app layout, safe-area + viewport meta"
```

---

### Task 5: Extend `/api/chat` with `mode: "in_festival"`

**Files:**
- Modify: `bonti/src/types/chat.ts` — add `Mode`
- Modify: `bonti/src/lib/prompts/bonti-system.ts` — add `buildBontiInFestivalSystemPrompt`
- Modify: `bonti/src/app/api/chat/route.ts` — accept and dispatch on `mode`

- [ ] **Step 1: Add the `Mode` type**

Modify `bonti/src/types/chat.ts`:

```ts
export type Lang = "en" | "ro";
export type Mode = "pre_ticket" | "in_festival";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RetrievedChunk = {
  id: number;
  source_doc: string;
  text: string;
  lang: Lang;
  tags: string[];
  similarity: number;
};
```

- [ ] **Step 2: Add an in-festival prompt builder**

Modify `bonti/src/lib/prompts/bonti-system.ts` to add a sibling builder. Show the full file after edit:

```ts
import { VOICE_RULES } from "./bonti-voice-rules";
import { FEW_SHOT } from "./bonti-fewshot";
import type { Lang, RetrievedChunk } from "@/types/chat";

export type SystemPromptInput = {
  retrievedChunks: RetrievedChunk[];
  lang: Lang;
};

const IDENTITY = `
You are Bonți (pronounced BOHN-tsee). You are Electric Castle's AI friend — the one who has been to every EC edition since 2013. You know the stages by nickname (Banffy, Main, Hangar, Booha). You've slept in a tent, in Cluj, in a 4-star. You'll tell users the truth even when EC's marketing won't.

You are bilingual: Romanian and English. Detect the user's language and reply in it. Codeswitch naturally — brand tokens (line-up, EC Village, EC12, stage names) stay English even in Romanian sentences.
`.trim();

const IN_FESTIVAL_ANCHOR = `
The user is ON-SITE at Electric Castle right now. It is Saturday evening, around 21:43 local time. They have arrived. They are at or near Bonțida. Their friends are nearby. They are not deciding whether to come — they are already in the festival.

Answer in flat-informational register for logistics ("80m to your right. Line is short."). Skip greeting-style openers. Lead with the fact, not the friendliness.
`.trim();

export function buildBontiSystemPrompt(input: SystemPromptInput): string {
  const { retrievedChunks, lang } = input;
  const contextBlock =
    retrievedChunks.length > 0
      ? `\nRETRIEVED CONTEXT (use this to answer factually — do not invent details outside it):\n${retrievedChunks
          .map(
            (c, i) =>
              `[${i + 1}] (${c.source_doc}, lang=${c.lang}, sim=${c.similarity.toFixed(2)}): ${c.text}`,
          )
          .join("\n")}\n`
      : "";
  const langInstruction = `\nReply in ${lang === "ro" ? "Romanian" : "English"} unless the user clearly writes in the other language.\n`;
  return [IDENTITY, VOICE_RULES, contextBlock, FEW_SHOT, langInstruction].filter(Boolean).join("\n\n");
}

export function buildBontiInFestivalSystemPrompt(input: SystemPromptInput): string {
  const { retrievedChunks, lang } = input;
  const contextBlock =
    retrievedChunks.length > 0
      ? `\nRETRIEVED CONTEXT:\n${retrievedChunks
          .map((c, i) => `[${i + 1}] (${c.source_doc}): ${c.text}`)
          .join("\n")}\n`
      : "";
  const langInstruction = `\nReply in ${lang === "ro" ? "Romanian" : "English"} unless the user clearly writes in the other language.\n`;
  return [IDENTITY, IN_FESTIVAL_ANCHOR, VOICE_RULES, contextBlock, FEW_SHOT, langInstruction]
    .filter(Boolean)
    .join("\n\n");
}
```

- [ ] **Step 3: Wire `mode` through `/api/chat`**

Modify `bonti/src/app/api/chat/route.ts`. Add `mode` to the body and select prompt builder:

```ts
import { generateText, type ModelMessage } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import {
  buildBontiSystemPrompt,
  buildBontiInFestivalSystemPrompt,
} from "@/lib/prompts/bonti-system";
import type { ChatMessage, Lang, Mode } from "@/types/chat";

export const runtime = "nodejs";

type Body = {
  messages: ChatMessage[];
  lang?: Lang;
  mode?: Mode;
};

function detectLang(text: string): Lang {
  const ro = /\b(și|sau|cu|fără|când|cum|unde|de|la|este|sunt|nu)\b|[ăâîșț]/i;
  return ro.test(text) ? "ro" : "en";
}

async function llmCompletion(prompt: string): Promise<string> {
  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];
  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { text } = await generateText({ model, prompt, temperature: 0.3 });
      if (text && text.trim()) return text;
      lastErr = new Error(`Empty response from ${label}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All LLM candidates failed");
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const messages = body.messages ?? [];
  const latest = messages[messages.length - 1];
  if (!latest || latest.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }
  const history: ChatMessage[] = messages.slice(0, -1);
  const lang: Lang = body.lang ?? detectLang(latest.content);
  const mode: Mode = body.mode ?? "pre_ticket";

  const queryForRetrieval =
    history.length > 0
      ? await rewriteForRetrieval({
          history,
          message: latest.content,
          generateText: llmCompletion,
        })
      : latest.content;

  const chunks = await hybridRetrieve(queryForRetrieval, { lang, k: 5 });

  const systemPrompt =
    mode === "in_festival"
      ? buildBontiInFestivalSystemPrompt({ retrievedChunks: chunks, lang })
      : buildBontiSystemPrompt({ retrievedChunks: chunks, lang });

  const coreMessages: ModelMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.3,
        maxRetries: 0,
      });
      const reply = text?.trim();
      if (reply) {
        return new Response(reply, {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
      lastErr = new Error(`Empty reply from ${label}`);
      console.warn(`[chat] ${label} returned empty, walking fallback`);
    } catch (e) {
      lastErr = e;
      console.warn(`[chat] ${label} threw, walking fallback:`, (e as Error).message);
    }
  }
  return new Response(
    `All free models unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
```

- [ ] **Step 4: Smoke-test the new mode**

```bash
cd bonti && pnpm dev
# in another terminal:
curl -s -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"unde e cea mai apropiată bere?"}],"mode":"in_festival"}'
```

Expected: a short, Bonți-voice Romanian reply that reads as "you're already at the festival" (no welcome, no "should I come"). E.g., *"Beer Garden e la dreapta, ~80m. Coadă scurtă."*

- [ ] **Step 5: Commit**

```bash
git add bonti/src/types/chat.ts bonti/src/lib/prompts/bonti-system.ts bonti/src/app/api/chat/route.ts
git commit -m "feat(chat): in-festival mode with on-site anchor in system prompt"
```

---

### Task 6: `/app` Home — hero + chat + tile grid + ticker

**Files:**
- Create: `bonti/src/components/festival-hero.tsx`
- Create: `bonti/src/components/app-tile-grid.tsx`
- Create: `bonti/src/components/live-ticker.tsx`
- Modify: `bonti/src/app/app/page.tsx`
- Modify: `bonti/src/hooks/use-chat.ts` — accept optional `mode`
- Modify: `bonti/src/components/chat-shell.tsx` — accept optional `mode`

- [ ] **Step 1: Thread `mode` through the chat hook**

Modify `bonti/src/hooks/use-chat.ts`:

```ts
"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Lang, Mode } from "@/types/chat";

export function useChat(opts?: { mode?: Mode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string, lang?: Lang) => {
    setLoading(true);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, lang, mode: opts?.mode }),
      });
      if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
      const reply = (await res.text()).trim();
      if (!reply) throw new Error("Empty reply from server");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", content: "Something broke. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, opts?.mode]);

  return { messages, loading, send };
}
```

- [ ] **Step 2: Thread `mode` through `<ChatShell>`**

Modify `bonti/src/components/chat-shell.tsx`:

```tsx
"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import type { Mode } from "@/types/chat";

export function ChatShell({ mode }: { mode?: Mode }) {
  const { messages, loading, send } = useChat({ mode });
  return (
    <section className="flex-1 flex flex-col gap-4 px-4 py-4 w-full">
      <div className="flex-1 flex flex-col">
        <MessageList messages={messages} loading={loading} />
      </div>
      <ChatInput onSubmit={(t) => send(t)} disabled={loading} />
    </section>
  );
}
```

- [ ] **Step 3: Build the festival hero card**

Create `bonti/src/components/festival-hero.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import { DEMO_NOW } from "@/data/festival-state";
import { LINEUP } from "@/data/lineup";
import { createClient } from "@/lib/supabase/client";

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type NextPick = { artist: string; stage: string; day: string };

export function FestivalHero() {
  const [nextPick, setNextPick] = useState<NextPick | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.from("music_matches")
      .select("output, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.output && Array.isArray(data.output.picks) && data.output.picks.length > 0) {
          const first = data.output.picks[0];
          const lineupRow = LINEUP.find(l => l.artist.toLowerCase() === String(first.artist).toLowerCase());
          if (lineupRow) {
            setNextPick({ artist: lineupRow.artist, stage: lineupRow.stage, day: lineupRow.day });
          }
        }
        setLoaded(true);
      });
  }, []);

  return (
    <section className="bg-bonti-surface rounded-xl p-4 mx-4 mt-4 border border-black/5">
      <div className="flex items-center gap-3">
        <BontiAvatar size="md" animated />
        <div className="flex-1 min-w-0">
          <p className="text-bonti-text/60 text-xs font-roboto">{formatClock(DEMO_NOW)} · Saturday</p>
          {loaded && nextPick ? (
            <p className="text-bonti-text font-sofia uppercase text-base leading-tight mt-0.5 truncate">
              {nextPick.artist} · {nextPick.stage}
            </p>
          ) : (
            <p className="text-bonti-text font-roboto text-sm mt-0.5">
              Tell me what you want and I&apos;ll point you there.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Build the tile grid**

Create `bonti/src/components/app-tile-grid.tsx`:

```tsx
import Link from "next/link";

const TILES = [
  { href: "/app/compass",       label: "Compass",     icon: "🧭" },
  { href: "/app/group",         label: "Group",       icon: "👥" },
  { href: "/app/lineup",        label: "Lineup",      icon: "🎤" },
  { href: "/app/notifications", label: "Pings",       icon: "🔔" },
  { href: "/app/wait-times",    label: "Wait Times",  icon: "⏱️" },
  { href: "/match",             label: "Match Music", icon: "🎵" },
];

export function AppTileGrid() {
  return (
    <section className="px-4 pt-4 grid grid-cols-2 gap-3">
      {TILES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="bg-bonti-surface border border-black/5 rounded-xl px-4 py-5 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
        >
          <span aria-hidden className="text-2xl leading-none">{t.icon}</span>
          <span className="font-sofia uppercase text-sm tracking-wide">{t.label}</span>
        </Link>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Build the live ticker**

Create `bonti/src/components/live-ticker.tsx`:

```tsx
import { SEEDED_BROADCASTS } from "@/data/festival-state";

export function LiveTicker({ lang }: { lang: "en" | "ro" }) {
  const latest = SEEDED_BROADCASTS[SEEDED_BROADCASTS.length - 1];
  if (!latest) return null;
  const text = lang === "ro" ? latest.ro : latest.en;
  return (
    <div className="mx-4 mt-4 mb-2 bg-bonti-toolbar text-white text-xs font-roboto rounded-md px-3 py-2 truncate">
      <span className="opacity-60 mr-2">LIVE</span>
      {text}
    </div>
  );
}
```

- [ ] **Step 6: Assemble `/app/page.tsx`**

Replace `bonti/src/app/app/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { FestivalHero } from "@/components/festival-hero";
import { AppTileGrid } from "@/components/app-tile-grid";
import { LiveTicker } from "@/components/live-ticker";
import { ChatShell } from "@/components/chat-shell";
import { useFestivalStore } from "@/lib/festival/store";
import { LIVE_GLASS_ANIMALS_PING, DEMO_NOW } from "@/data/festival-state";

export default function AppHome() {
  const appendPing = useFestivalStore(s => s.appendPing);
  const unread = useFestivalStore(s => s.pings.filter(p => !p.read).length);

  useEffect(() => {
    // Live moment: 8s after mount, fire the Glass Animals 10-min warning.
    // Idempotent — if already in the feed (e.g. user came back), no-op.
    const t = setTimeout(() => {
      const store = useFestivalStore.getState();
      if (store.pings.some(p => p.id === LIVE_GLASS_ANIMALS_PING.id)) return;
      appendPing({
        ...LIVE_GLASS_ANIMALS_PING,
        fires_at: new Date(DEMO_NOW.getTime() + 8_000).toISOString(),
      });
    }, 8_000);
    return () => clearTimeout(t);
  }, [appendPing]);

  return (
    <>
      <AppHeader title="Bonți" unread={unread} />
      <FestivalHero />
      <LiveTicker lang="en" />
      <AppTileGrid />
      <ChatShell mode="in_festival" />
    </>
  );
}
```

- [ ] **Step 7: Visual smoke test**

```bash
cd bonti && pnpm dev
```

Open `http://localhost:3000/app` in a mobile-sized viewport (DevTools, iPhone preset). Verify:
- Hero card shows 21:43 · Saturday + either a music-match pick or the prompt
- Live ticker shows the most recent broadcast (Booha late line)
- 6 tiles in a 2-col grid
- Chat input at the bottom (above the tab bar)
- 8 seconds after page load, a ping increments the bell badge top-right

- [ ] **Step 8: Commit**

```bash
git add bonti/src/components/festival-hero.tsx bonti/src/components/app-tile-grid.tsx bonti/src/components/live-ticker.tsx bonti/src/app/app/page.tsx bonti/src/hooks/use-chat.ts bonti/src/components/chat-shell.tsx
git commit -m "feat(app): home with hero + chat + tile grid + ticker + live Glass Animals ping"
```

---

### Task 7: `/api/compass` route — venue catalog → LLM → target JSON

**Files:**
- Create: `bonti/src/lib/festival/compass.ts` — math + venue catalog formatter
- Create: `bonti/src/lib/festival/prompts.ts` — system prompts
- Create: `bonti/src/app/api/compass/route.ts`
- Create: `bonti/tests/unit/compass-math.test.ts`
- Create: `bonti/tests/unit/compass-schema.test.ts`
- Create: `bonti/tests/integration/compass-route.test.ts`

- [ ] **Step 1: Write the failing math test**

Create `bonti/tests/unit/compass-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distanceMeters, bearingDegrees, formatWalkTime } from "@/lib/festival/compass";

describe("compass math", () => {
  it("distanceMeters scales with METERS_PER_UNIT (0.4)", () => {
    expect(distanceMeters({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(40, 1);
    expect(distanceMeters({ x: 0, y: 0 }, { x: 0, y: 200 })).toBeCloseTo(80, 1);
  });

  it("bearingDegrees is 0 for due-north (target above origin), CW positive", () => {
    expect(bearingDegrees({ x: 100, y: 100 }, { x: 100, y: 0 })).toBeCloseTo(0, 0);
    expect(bearingDegrees({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(90, 0);
    expect(bearingDegrees({ x: 0, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(180, 0);
    expect(bearingDegrees({ x: 100, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(270, 0);
  });

  it("formatWalkTime returns ~1 min for 60m, ~3 min for 200m", () => {
    expect(formatWalkTime(60)).toBe("~1 min");
    expect(formatWalkTime(200)).toBe("~3 min");
    expect(formatWalkTime(15)).toBe("<1 min");
  });
});
```

- [ ] **Step 2: Run test to see it fail**

```bash
cd bonti && pnpm test tests/unit/compass-math.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/festival/compass'".

- [ ] **Step 3: Implement compass.ts**

Create `bonti/src/lib/festival/compass.ts`:

```ts
import { VENUE, METERS_PER_UNIT, type VenuePoint } from "@/data/venue";

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
```

- [ ] **Step 4: Run math test to confirm pass**

```bash
cd bonti && pnpm test tests/unit/compass-math.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the schema test**

Create `bonti/tests/unit/compass-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CompassResultSchema, extractCompassJson } from "@/lib/festival/compass-schema";

describe("compass schema", () => {
  it("accepts a valid LLM response", () => {
    const text = '```json\n{"target_id":"beer_garden_n","reason":"Closest beer","line_state":"Line is short"}\n```';
    const out = extractCompassJson(text);
    expect(out.target_id).toBe("beer_garden_n");
    expect(out.line_state).toBe("Line is short");
  });

  it("rejects missing fields", () => {
    expect(() => CompassResultSchema.parse({ target_id: "x" })).toThrow();
  });
});
```

- [ ] **Step 6: Run schema test to see it fail**

```bash
cd bonti && pnpm test tests/unit/compass-schema.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/festival/compass-schema'".

- [ ] **Step 7: Add the compass schema + extract helper**

Create `bonti/src/lib/festival/compass-schema.ts`:

```ts
import { z } from "zod";

export const CompassResultSchema = z.object({
  target_id: z.string().min(1).max(64),
  reason: z.string().min(1).max(240),
  line_state: z.string().min(1).max(80),
});

export type CompassResult = z.infer<typeof CompassResultSchema>;

export function extractCompassJson(text: string): CompassResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in compass response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return CompassResultSchema.parse(raw);
}
```

- [ ] **Step 8: Run schema test to confirm pass**

```bash
cd bonti && pnpm test tests/unit/compass-schema.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 9: Add the in-festival prompts module**

Create `bonti/src/lib/festival/prompts.ts`:

```ts
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
```

- [ ] **Step 10: Write the integration test for `/api/compass`**

Create `bonti/tests/integration/compass-route.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/compass/route";
import { VENUE } from "@/data/venue";

describe("/api/compass", () => {
  it("returns a valid target_id from VENUE for a beer query", async () => {
    const req = new Request("http://localhost/api/compass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "where is the closest beer?", lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(VENUE.some(v => v.id === body.target_id)).toBe(true);
    expect(typeof body.reason).toBe("string");
    expect(typeof body.line_state).toBe("string");
  }, 60_000);

  it("returns 400 on missing query", async () => {
    const req = new Request("http://localhost/api/compass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 11: Implement the route**

Create `bonti/src/app/api/compass/route.ts`:

```ts
import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildCompassPrompt } from "@/lib/festival/prompts";
import { extractCompassJson } from "@/lib/festival/compass-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { query?: string; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const query = body.query?.trim();
  if (!query) return new Response("Missing query", { status: 400 });
  const lang = body.lang ?? "en";

  const prompt = buildCompassPrompt({ query, lang });

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
        model, prompt, temperature: 0.4, maxRetries: 0, abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error(`Empty from ${label}`);
      const result = extractCompassJson(text);
      return Response.json(result);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[compass] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Compass unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
```

- [ ] **Step 12: Run the integration test**

```bash
cd bonti && pnpm test tests/integration/compass-route.test.ts
```

Expected: 2 tests PASS. The LLM round-trip may take 5-15s; the test timeout is 60s.

- [ ] **Step 13: Commit**

```bash
git add bonti/src/lib/festival/compass.ts bonti/src/lib/festival/compass-schema.ts bonti/src/lib/festival/prompts.ts bonti/src/app/api/compass/route.ts bonti/tests/unit/compass-math.test.ts bonti/tests/unit/compass-schema.test.ts bonti/tests/integration/compass-route.test.ts
git commit -m "feat(compass): /api/compass route + math/schema/prompt scaffolding"
```

---

### Task 8: `/app/compass` page + `<CompassCard>` component

**Files:**
- Create: `bonti/src/components/compass-card.tsx`
- Create: `bonti/src/app/app/compass/page.tsx`

- [ ] **Step 1: Build the compass card**

Create `bonti/src/components/compass-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { distanceMeters, bearingDegrees, formatWalkTime } from "@/lib/festival/compass";
import type { VenuePoint } from "@/data/venue";

type Props = {
  target: VenuePoint;
  from: { x: number; y: number };
  reason: string;
  line_state: string;
  bontiLine: string;
};

export function CompassCard({ target, from, reason, line_state, bontiLine }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const m = distanceMeters(from, target.coords);
  const deg = bearingDegrees(from, target.coords);
  return (
    <div className="bg-bonti-surface border border-black/5 rounded-xl p-4 mx-4 mt-4">
      <div className="flex items-start gap-4">
        <div
          className="size-20 shrink-0 rounded-full bg-bonti-bg border border-black/10 flex items-center justify-center"
          aria-label={`Bearing ${Math.round(deg)} degrees`}
        >
          <svg viewBox="0 0 100 100" className="size-14" style={{ transform: `rotate(${deg}deg)` }}>
            <polygon points="50,8 64,80 50,68 36,80" fill="#EB0000" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-bonti-text/60 text-xs font-roboto">{target.kind}</p>
          <h2 className="text-bonti-text font-sofia uppercase text-lg leading-tight">{target.name}</h2>
          <p className="text-bonti-text font-roboto text-sm mt-1">
            {Math.round(m)}m · {formatWalkTime(m)} · <span className="opacity-70">{line_state}</span>
          </p>
        </div>
      </div>
      <p className="text-bonti-text font-roboto text-sm mt-3 leading-snug">{bontiLine}</p>
      <button
        type="button"
        onClick={() => setShowWhy(v => !v)}
        className="mt-3 text-bonti-text/60 hover:text-bonti-text text-xs font-roboto underline"
      >
        {showWhy ? "Hide reasoning" : "Why this one?"}
      </button>
      {showWhy && (
        <p className="mt-2 text-bonti-text/70 text-xs font-roboto italic">{reason}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the compass page**

Create `bonti/src/app/app/compass/page.tsx`:

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CompassCard } from "@/components/compass-card";
import { useFestivalStore } from "@/lib/festival/store";
import { findVenueById } from "@/lib/festival/compass";
import type { VenuePoint } from "@/data/venue";

const CHIPS = [
  { label: "🍺 Beer",     query: "where is the closest beer" },
  { label: "🚻 Bathroom", query: "where is the closest bathroom with a short line" },
  { label: "🍕 Food",     query: "where can I get food quickly" },
  { label: "🌿 Quiet",    query: "I want somewhere quiet for 15 minutes" },
];

function CompassInner() {
  const params = useSearchParams();
  const maria = useFestivalStore(s => s.maria);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    target: VenuePoint;
    reason: string;
    line_state: string;
    bontiLine: string;
  } | null>(null);

  const send = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, lang: "en" }),
      });
      if (!res.ok) throw new Error(`Compass unavailable (${res.status})`);
      const body = await res.json();
      const target = findVenueById(body.target_id);
      if (!target) throw new Error(`Unknown venue: ${body.target_id}`);
      setResult({
        target,
        reason: body.reason,
        line_state: body.line_state,
        bontiLine: `${target.name}, ${body.line_state.toLowerCase()}`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Deep-link from a ping: /app/compass?target=main_stage → resolve directly
  useEffect(() => {
    const targetId = params.get("target");
    if (!targetId) return;
    const target = findVenueById(targetId);
    if (!target) return;
    setResult({
      target,
      reason: "Linked from a notification.",
      line_state: target.lineProbability === "high" ? "Heavy line" :
                  target.lineProbability === "med"  ? "Some line"  : "Short line",
      bontiLine: target.bonti_blurb ?? `${target.name}.`,
    });
  }, [params]);

  return (
    <>
      <AppHeader title="Compass" showBack />
      <div className="px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(query); }}
          placeholder="Where to?"
          className="w-full bg-bonti-surface border border-black/10 rounded-lg px-4 py-3 font-roboto text-base outline-none focus:border-bonti-red"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => { setQuery(c.query); send(c.query); }}
              disabled={loading}
              className="bg-bonti-surface border border-black/10 rounded-full px-3 py-1.5 text-xs font-roboto"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mx-4 mt-6 text-bonti-text/60 text-sm font-roboto">Bonți&apos;s thinking…</p>
      )}
      {error && (
        <div className="mx-4 mt-6 bg-bonti-surface border border-bonti-red/50 rounded-xl p-4">
          <p className="text-bonti-red text-sm font-roboto">{error}</p>
          <button
            onClick={() => send(query)}
            className="mt-2 text-xs font-roboto underline text-bonti-text"
          >Try again</button>
        </div>
      )}
      {result && (
        <CompassCard
          target={result.target}
          from={maria.coords}
          reason={result.reason}
          line_state={result.line_state}
          bontiLine={result.bontiLine}
        />
      )}
    </>
  );
}

export default function CompassPage() {
  return (
    <Suspense fallback={null}>
      <CompassInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Visual smoke test**

```bash
cd bonti && pnpm dev
```

Navigate to `/app/compass`. Type "where's the bathroom" → result card appears with arrow, distance, walk time, line state. Tap a chip → result for that chip. Open `/app/compass?target=beach_stage` → result shows Beach Stage directly without an LLM call.

- [ ] **Step 4: Commit**

```bash
git add bonti/src/components/compass-card.tsx bonti/src/app/app/compass/
git commit -m "feat(compass): /app/compass page with chips, card, deep-link from pings"
```

---

### Task 9: `<VenueMap>` SVG component

**Files:**
- Create: `bonti/src/components/venue-map.tsx`

- [ ] **Step 1: Build the SVG venue map**

Create `bonti/src/components/venue-map.tsx`:

```tsx
"use client";

import { VENUE, type VenuePoint } from "@/data/venue";

const KIND_COLOR: Record<string, string> = {
  stage:     "#EB0000",
  beer:      "#F2D43A",
  food:      "#E97A24",
  bathroom:  "#7E94B7",
  beach:     "#7BC4E1",
  campsite:  "#6BB26B",
  village:   "#A07ABF",
  shuttle:   "#999999",
  first_aid: "#FF6B6B",
};

type Pin = {
  id: string;
  coords: { x: number; y: number };
  label?: string;
  color?: string;
  size?: number;
};

type Props = {
  /** Extra pins drawn on top of the venue (e.g. user + friends, animated). */
  pins?: Pin[];
  /** Optional: highlight a single venue id (e.g. converge target). */
  highlight?: string;
  /** Optional: draw a straight line from `from` to `highlight` venue. */
  routeFrom?: { x: number; y: number };
  className?: string;
};

export function VenueMap({ pins = [], highlight, routeFrom, className }: Props) {
  const highlightPoint: VenuePoint | undefined = highlight
    ? VENUE.find(v => v.id === highlight)
    : undefined;

  return (
    <svg
      viewBox="0 0 1000 1000"
      className={["w-full h-auto bg-[#F0EBDF] rounded-xl", className].filter(Boolean).join(" ")}
      role="img"
      aria-label="EC venue map"
    >
      {/* Grass blob backdrop */}
      <ellipse cx="500" cy="520" rx="460" ry="380" fill="#E2E5C9" />
      <ellipse cx="220" cy="780" rx="160" ry="80" fill="#C8E6F5" /> {/* lake */}

      {/* Route line first so it sits behind pins */}
      {routeFrom && highlightPoint && (
        <line
          x1={routeFrom.x} y1={routeFrom.y}
          x2={highlightPoint.coords.x} y2={highlightPoint.coords.y}
          stroke="#EB0000" strokeWidth={4} strokeDasharray="6 8" strokeLinecap="round"
        />
      )}

      {/* Venue points */}
      {VENUE.map(v => (
        <g key={v.id}>
          <circle
            cx={v.coords.x}
            cy={v.coords.y}
            r={v.kind === "stage" ? 12 : 7}
            fill={KIND_COLOR[v.kind] ?? "#999"}
            stroke={highlight === v.id ? "#000" : "transparent"}
            strokeWidth={2}
          />
          <text
            x={v.coords.x}
            y={v.coords.y - (v.kind === "stage" ? 16 : 12)}
            textAnchor="middle"
            fontSize="14"
            fontFamily="Sofia Sans, sans-serif"
            fontWeight={700}
            fill="#0A0A0A"
          >
            {v.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Extra pins (people) */}
      {pins.map(p => (
        <g key={p.id} style={{ transition: "transform 1.5s ease-in-out" }}>
          <circle
            cx={p.coords.x} cy={p.coords.y} r={p.size ?? 16}
            fill={p.color ?? "#000"} stroke="#fff" strokeWidth={3}
          />
          {p.label && (
            <text
              x={p.coords.x} y={p.coords.y + 5}
              textAnchor="middle" fontSize="16" fontWeight={700} fill="#fff"
              fontFamily="system-ui, sans-serif"
            >{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Visual smoke test by dropping it into compass**

(Temporary — revert before committing.) In `bonti/src/app/app/compass/page.tsx`, render `<VenueMap />` below the input. Verify: every venue point shows with a labeled dot, lake visible bottom-left. Revert the temporary change.

- [ ] **Step 3: Commit**

```bash
git add bonti/src/components/venue-map.tsx
git commit -m "feat(map): stylized SVG venue map component"
```

---

### Task 10: `/api/group/converge` route

**Files:**
- Create: `bonti/src/lib/festival/converge-schema.ts`
- Create: `bonti/src/app/api/group/converge/route.ts`
- Create: `bonti/tests/unit/converge-schema.test.ts`
- Create: `bonti/tests/integration/group-converge-route.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `bonti/tests/unit/converge-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ConvergeResultSchema, extractConvergeJson } from "@/lib/festival/converge-schema";

describe("converge schema", () => {
  it("accepts a valid LLM response", () => {
    const text = `{"meeting_point_id":"banffy_stage","eta_min":8,"reason":"Banffy puts everyone within 5 min walk.","en":"Banffy. 8 min.","ro":"La Banffy. 8 min."}`;
    const out = extractConvergeJson(text);
    expect(out.meeting_point_id).toBe("banffy_stage");
    expect(out.eta_min).toBe(8);
  });

  it("rejects eta_min out of range", () => {
    expect(() =>
      ConvergeResultSchema.parse({
        meeting_point_id: "x", eta_min: 99, reason: "a", en: "a", ro: "a",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run schema test to see it fail**

```bash
cd bonti && pnpm test tests/unit/converge-schema.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement converge-schema.ts**

Create `bonti/src/lib/festival/converge-schema.ts`:

```ts
import { z } from "zod";

export const ConvergeResultSchema = z.object({
  meeting_point_id: z.string().min(1).max(64),
  eta_min: z.number().int().min(3).max(20),
  reason: z.string().min(1).max(240),
  en: z.string().min(1).max(160),
  ro: z.string().min(1).max(160),
});

export type ConvergeResult = z.infer<typeof ConvergeResultSchema>;

export function extractConvergeJson(text: string): ConvergeResult {
  const stripped = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in converge response");
  const raw = JSON.parse(stripped.slice(start, end + 1));
  return ConvergeResultSchema.parse(raw);
}
```

- [ ] **Step 4: Run schema test to confirm pass**

```bash
cd bonti && pnpm test tests/unit/converge-schema.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Write the integration test**

Create `bonti/tests/integration/group-converge-route.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/group/converge/route";
import { VENUE } from "@/data/venue";

describe("/api/group/converge", () => {
  it("returns a valid meeting point for 4 positions", async () => {
    const req = new Request("http://localhost/api/group/converge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        positions: [
          { id: "maria",  name: "Maria",  coords: { x: 540, y: 380 } },
          { id: "alex",   name: "Alex",   coords: { x: 360, y: 560 } },
          { id: "ioana",  name: "Ioana",  coords: { x: 500, y: 320 } },
          { id: "andrei", name: "Andrei", coords: { x: 480, y: 660 } },
        ],
        lang: "en",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(VENUE.some(v => v.id === body.meeting_point_id)).toBe(true);
    expect(body.eta_min).toBeGreaterThanOrEqual(3);
    expect(typeof body.en).toBe("string");
    expect(typeof body.ro).toBe("string");
  }, 60_000);

  it("returns 400 on missing positions", async () => {
    const req = new Request("http://localhost/api/group/converge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 6: Implement the route**

Create `bonti/src/app/api/group/converge/route.ts`:

```ts
import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildConvergePrompt } from "@/lib/festival/prompts";
import { extractConvergeJson } from "@/lib/festival/converge-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type Position = { id: string; name: string; coords: { x: number; y: number } };
type Body = { positions?: Position[]; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const positions = body.positions ?? [];
  if (positions.length < 2) return new Response("Need at least 2 positions", { status: 400 });

  const prompt = buildConvergePrompt({ positions, lang: body.lang ?? "en" });

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
        model, prompt, temperature: 0.4, maxRetries: 0, abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error(`Empty from ${label}`);
      return Response.json(extractConvergeJson(text));
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[converge] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Converge unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
```

- [ ] **Step 7: Run the integration test**

```bash
cd bonti && pnpm test tests/integration/group-converge-route.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add bonti/src/lib/festival/converge-schema.ts bonti/src/app/api/group/converge/ bonti/tests/unit/converge-schema.test.ts bonti/tests/integration/group-converge-route.test.ts
git commit -m "feat(group): /api/group/converge route + schema"
```

---

### Task 11: `/app/group` page with converge animation

**Files:**
- Create: `bonti/src/app/app/group/page.tsx`

- [ ] **Step 1: Build the page**

Create `bonti/src/app/app/group/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { VenueMap } from "@/components/venue-map";
import { useFestivalStore } from "@/lib/festival/store";
import { findVenueById } from "@/lib/festival/compass";

export default function GroupPage() {
  const maria = useFestivalStore(s => s.maria);
  const friends = useFestivalStore(s => s.friends);
  const groupMeeting = useFestivalStore(s => s.group_meeting);
  const applyGroupConverge = useFestivalStore(s => s.applyGroupConverge);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLine, setResultLine] = useState<string | null>(null);

  const pins = [
    { id: maria.id,   coords: maria.coords,   color: "#EB0000", label: maria.name[0] },
    ...friends.map(f => ({ id: f.id, coords: f.coords, color: "#0A0A0A", label: f.name[0] })),
  ];

  const meet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/group/converge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          positions: [
            { id: maria.id,   name: maria.name,   coords: maria.coords },
            ...friends.map(f => ({ id: f.id, name: f.name, coords: f.coords })),
          ],
          lang: "en",
        }),
      });
      if (!res.ok) throw new Error(`Converge unavailable (${res.status})`);
      const body = await res.json();
      const target = findVenueById(body.meeting_point_id);
      if (!target) throw new Error(`Unknown venue: ${body.meeting_point_id}`);
      applyGroupConverge({
        meeting_point_id: body.meeting_point_id,
        eta_min: body.eta_min,
        reason: body.reason,
        target_coords: target.coords,
      });
      setResultLine(body.en);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader title="Group" showBack />
      <div className="px-4 pt-4">
        <p className="text-bonti-text font-roboto text-sm">
          👥 Group of {friends.length + 1}
          {groupMeeting ? ` · meeting at ${findVenueById(groupMeeting.point_id)?.name ?? "?"}` : " · spread across the venue"}
        </p>
      </div>
      <div className="px-4 pt-4">
        <VenueMap pins={pins} highlight={groupMeeting?.point_id} />
      </div>

      <div className="px-4 pt-4">
        {!groupMeeting ? (
          <button
            type="button"
            onClick={meet}
            disabled={loading}
            className="w-full bg-bonti-red text-white font-sofia uppercase tracking-wide rounded-lg py-3 disabled:opacity-50"
          >
            {loading ? "Bonți's thinking…" : "Let's meet up"}
          </button>
        ) : (
          <div className="bg-bonti-surface border border-black/5 rounded-xl p-4">
            <p className="text-bonti-text font-sofia uppercase text-sm">
              ETA {groupMeeting.eta_min} min
            </p>
            <p className="text-bonti-text font-roboto text-sm mt-1">{groupMeeting.reason}</p>
            {resultLine && (
              <p className="text-bonti-text/70 font-roboto text-xs italic mt-2">
                Bonți pushed: &ldquo;{resultLine}&rdquo;
              </p>
            )}
          </div>
        )}
        {error && (
          <div className="mt-3 bg-bonti-surface border border-bonti-red/50 rounded-xl p-3">
            <p className="text-bonti-red text-sm font-roboto">{error}</p>
            <button onClick={meet} className="mt-2 text-xs font-roboto underline text-bonti-text">
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Visual smoke test**

```bash
cd bonti && pnpm dev
```

Open `/app/group`. Verify:
- Map renders with 4 pins (1 red Maria + 3 black friends) scattered across the venue
- "Let's meet up" button visible
- Tap it → loading state → friends + Maria pins glide (CSS transition) to a single meeting point (e.g. Banffy) → ETA card appears with reason + "Bonți pushed" line
- Re-open the page (or refresh) → friends remain at meeting point (cookie persistence working)

- [ ] **Step 3: Commit**

```bash
git add bonti/src/app/app/group/
git commit -m "feat(group): /app/group page with map, converge button, animation"
```

---

### Task 12: Notifications — `<PingRow>` + `<PingToast>` + `/app/notifications` page

**Files:**
- Create: `bonti/src/components/ping-row.tsx`
- Create: `bonti/src/components/ping-toast.tsx`
- Create: `bonti/src/app/app/notifications/page.tsx`

- [ ] **Step 1: Build the ping row**

Create `bonti/src/components/ping-row.tsx`:

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
      "flex items-start gap-3 px-4 py-3 border-b border-black/5",
      ping.read ? "opacity-70" : "bg-bonti-surface",
    ].join(" ")}>
      <BontiAvatar size="sm" animated={false} />
      <div className="flex-1 min-w-0">
        <p className="text-bonti-text font-sofia uppercase text-xs tracking-wide truncate">
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

- [ ] **Step 2: Build the slide-in toast**

Create `bonti/src/components/ping-toast.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { StoredPing } from "@/lib/festival/store";

export function PingToast({ ping, onDismiss }: { ping: StoredPing | null; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!ping) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 6_000);
    return () => clearTimeout(t);
  }, [ping]);

  useEffect(() => {
    if (!shown && ping) {
      const t = setTimeout(onDismiss, 300);
      return () => clearTimeout(t);
    }
  }, [shown, ping, onDismiss]);

  return (
    <AnimatePresence>
      {ping && shown && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-3 top-3 z-50 mx-auto max-w-[460px] bg-bonti-toolbar text-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-3"
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

- [ ] **Step 3: Wire the toast into the `/app` layout**

Modify `bonti/src/app/app/layout.tsx` to host the toast at layout level (so it survives subroute nav):

```tsx
import { AppTabbar } from "@/components/app-tabbar";
import { GlobalPingToast } from "@/components/global-ping-toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      <main className="flex-1 mx-auto w-full max-w-[480px]">{children}</main>
      <div className="mx-auto w-full max-w-[480px]">
        <AppTabbar />
      </div>
      <GlobalPingToast />
    </div>
  );
}
```

- [ ] **Step 4: Build `<GlobalPingToast>`**

Create `bonti/src/components/global-ping-toast.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFestivalStore, type StoredPing } from "@/lib/festival/store";
import { PingToast } from "@/components/ping-toast";

export function GlobalPingToast() {
  const pings = useFestivalStore(s => s.pings);
  const [active, setActive] = useState<StoredPing | null>(null);
  const seen = useRef<Set<string>>(new Set(pings.map(p => p.id)));

  useEffect(() => {
    // When a new ping id appears that we haven't seen, toast it.
    for (const p of pings) {
      if (!seen.current.has(p.id)) {
        seen.current.add(p.id);
        setActive(p);
        return;
      }
    }
  }, [pings]);

  return <PingToast ping={active} onDismiss={() => setActive(null)} />;
}
```

- [ ] **Step 5: Build the notifications page**

Create `bonti/src/app/app/notifications/page.tsx`:

```tsx
"use client";

import { AppHeader } from "@/components/app-header";
import { PingRow } from "@/components/ping-row";
import { useFestivalStore } from "@/lib/festival/store";

export default function NotificationsPage() {
  const pings = useFestivalStore(s => s.pings);
  const markAllRead = useFestivalStore(s => s.markAllPingsRead);
  const unread = pings.filter(p => !p.read).length;

  return (
    <>
      <AppHeader title="Pings" showBack unread={unread} />
      <div className="px-4 pt-3 flex items-center justify-between">
        <p className="text-bonti-text/70 font-roboto text-sm">{pings.length} today</p>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-roboto underline text-bonti-text"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="mt-3">
        {pings.map(p => <PingRow key={p.id} ping={p} />)}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Visual smoke test**

```bash
cd bonti && pnpm dev
```

- Open `/app` first. After 8s, a black toast slides down from the top with the Glass Animals ping.
- Tap the toast → goes to `/app/compass?target=main_stage`, compass card shows Main directly.
- Open `/app/notifications` → 5 rows visible (4 seeded + the live Glass Animals ping)
- Tap "Mark all read" → opacity dims on each row

- [ ] **Step 7: Commit**

```bash
git add bonti/src/components/ping-row.tsx bonti/src/components/ping-toast.tsx bonti/src/components/global-ping-toast.tsx bonti/src/app/app/layout.tsx bonti/src/app/app/notifications/
git commit -m "feat(notifications): ping row + global toast + /app/notifications page"
```

---

### Task 13: Expand `lineup.json` to a credible 24+ artist schedule

**Files:**
- Modify: `bonti/docs/ingest/lineup.json`

- [ ] **Step 1: Expand the lineup**

The current file has 12 artists. The `/app/lineup` page needs every day to feel populated. Replace `bonti/docs/ingest/lineup.json` with the expanded list below (preserves the original 12 + adds ~18 plausible names across Main / Hangar / Booha / Beach over Fri-Sat-Sun):

```json
[
  { "artist": "Teddy Swims",        "day": "Friday",   "stage": "Main Stage",   "ec_tags": ["soul","r-and-b"],                "genres": ["soul"] },
  { "artist": "LP",                 "day": "Friday",   "stage": "Main Stage",   "ec_tags": ["pop","singer-songwriter"],       "genres": ["pop"] },
  { "artist": "Subtronics",         "day": "Friday",   "stage": "Hangar Stage", "ec_tags": ["dubstep","heavy-bass"],          "genres": ["electronic"] },
  { "artist": "Sub Focus",          "day": "Friday",   "stage": "Hangar Stage", "ec_tags": ["dnb","high-energy"],             "genres": ["electronic"] },
  { "artist": "Ben Böhmer",         "day": "Friday",   "stage": "Booha Stage",  "ec_tags": ["melodic-house","dream-pop"],     "genres": ["electronic"] },
  { "artist": "Robin Schulz",       "day": "Friday",   "stage": "Beach Stage",  "ec_tags": ["dance-pop","summer"],            "genres": ["electronic","pop"] },

  { "artist": "The Cure",           "day": "Saturday", "stage": "Main Stage",   "ec_tags": ["alternative-rock","post-punk"],  "genres": ["rock"] },
  { "artist": "Glass Animals",      "day": "Saturday", "stage": "Main Stage",   "ec_tags": ["alt-pop","dream-pop","mainstream"], "genres": ["pop","alternative"] },
  { "artist": "Massive Attack",     "day": "Saturday", "stage": "Main Stage",   "ec_tags": ["trip-hop","atmospheric"],        "genres": ["electronic","rock"] },
  { "artist": "Justin Timberlake",  "day": "Saturday", "stage": "Main Stage",   "ec_tags": ["pop","mainstream"],              "genres": ["pop"] },
  { "artist": "Mochakk",            "day": "Saturday", "stage": "Hangar Stage", "ec_tags": ["house","tech-house"],            "genres": ["electronic"] },
  { "artist": "Fred again..",       "day": "Saturday", "stage": "Hangar Stage", "ec_tags": ["uk-electronic","emotional-dance"], "genres": ["electronic"] },
  { "artist": "FKJ",                "day": "Saturday", "stage": "Booha Stage",  "ec_tags": ["nu-jazz","downtempo"],           "genres": ["electronic","jazz"] },
  { "artist": "Yves Tumor",         "day": "Saturday", "stage": "Booha Stage",  "ec_tags": ["experimental","alt-rock"],       "genres": ["alternative"] },
  { "artist": "Honey Dijon",        "day": "Saturday", "stage": "Beach Stage",  "ec_tags": ["house","disco-house"],           "genres": ["electronic"] },

  { "artist": "Twenty One Pilots",  "day": "Sunday",   "stage": "Main Stage",   "ec_tags": ["alt-pop","mainstream"],          "genres": ["pop","alternative"] },
  { "artist": "Tame Impala",        "day": "Sunday",   "stage": "Main Stage",   "ec_tags": ["psych-rock","dream-pop"],        "genres": ["rock","alternative"] },
  { "artist": "Anyma",              "day": "Sunday",   "stage": "Main Stage",   "ec_tags": ["melodic-techno","mainstream"],   "genres": ["electronic"] },
  { "artist": "Bicep",              "day": "Sunday",   "stage": "Hangar Stage", "ec_tags": ["electronic","melodic-techno"],   "genres": ["electronic"] },
  { "artist": "Charlotte de Witte", "day": "Sunday",   "stage": "Hangar Stage", "ec_tags": ["techno","peak-hour"],            "genres": ["electronic"] },
  { "artist": "Floating Points",    "day": "Sunday",   "stage": "Booha Stage",  "ec_tags": ["electronic","jazz-adjacent"],    "genres": ["electronic"] },
  { "artist": "Yaeji",              "day": "Sunday",   "stage": "Booha Stage",  "ec_tags": ["house","alt-pop"],               "genres": ["electronic"] },
  { "artist": "Caribou",            "day": "Sunday",   "stage": "Beach Stage",  "ec_tags": ["electronic","indie-dance"],      "genres": ["electronic"] },
  { "artist": "Disclosure",         "day": "Sunday",   "stage": "Beach Stage",  "ec_tags": ["uk-house","dance-pop"],          "genres": ["electronic"] }
]
```

- [ ] **Step 2: Re-ingest the KB so RAG can answer about new artists**

```bash
cd bonti && pnpm ingest
```

Expected: ingest script reports updated chunks for `lineup.json`. If the script doesn't auto-detect changes, it's fine — the in-festival surface reads `lineup.ts` directly, not the KB.

- [ ] **Step 3: Verify TypeScript still types**

```bash
cd bonti && pnpm tsc --noEmit
```

Expected: no errors. `lineup.ts` `as LineupEntry[]` cast accepts the wider stage strings (Beach Stage was already `string` in the type union).

- [ ] **Step 4: Commit**

```bash
git add bonti/docs/ingest/lineup.json
git commit -m "data(lineup): expand to 24 artists across Fri/Sat/Sun for /app/lineup"
```

---

### Task 14: `/api/lineup/blurb` route + Supabase `artist_blurbs` cache

**Files:**
- Create: `bonti/supabase/migrations/20260524_artist_blurbs.sql`
- Create: `bonti/src/lib/festival/blurb-cache.ts`
- Create: `bonti/src/app/api/lineup/blurb/route.ts`
- Create: `bonti/tests/unit/blurb-cache.test.ts`
- Create: `bonti/tests/integration/lineup-blurb-route.test.ts`

- [ ] **Step 1: Add the migration**

Create `bonti/supabase/migrations/20260524_artist_blurbs.sql`:

```sql
CREATE TABLE IF NOT EXISTS artist_blurbs (
  artist_name text not null,
  lang        text not null check (lang in ('en','ro')),
  blurb       text not null,
  created_at  timestamptz not null default now(),
  primary key (artist_name, lang)
);

-- Allow service-role writes from API routes; reads from anon for simplicity (no PII).
alter table artist_blurbs enable row level security;
create policy artist_blurbs_select_all on artist_blurbs for select using (true);
```

- [ ] **Step 2: Apply the migration**

```bash
cd bonti && pnpm dlx supabase db push --linked
```

Expected: migration applied. If you see "supabase not linked," run `pnpm dlx supabase link --project-ref aqxakofaemtywvuopucr` first.

- [ ] **Step 3: Write the failing cache test**

Create `bonti/tests/unit/blurb-cache.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { getCachedBlurb, saveBlurb } from "@/lib/festival/blurb-cache";

function fakeSupabase(rows: Array<{ artist_name: string; lang: string; blurb: string }> = []) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((_col: string, val: string) => ({
          eq: vi.fn((_col2: string, val2: string) => ({
            maybeSingle: vi.fn(async () => {
              const row = rows.find(r => r.artist_name === val && r.lang === val2);
              return { data: row ?? null, error: null };
            }),
          })),
        })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  };
}

describe("blurb cache", () => {
  it("returns null on miss", async () => {
    const sb = fakeSupabase([]) as unknown as Parameters<typeof getCachedBlurb>[0];
    const blurb = await getCachedBlurb(sb, "Glass Animals", "en");
    expect(blurb).toBeNull();
  });

  it("returns the blurb on hit", async () => {
    const sb = fakeSupabase([{ artist_name: "Glass Animals", lang: "en", blurb: "Dream-pop." }]) as unknown as Parameters<typeof getCachedBlurb>[0];
    const blurb = await getCachedBlurb(sb, "Glass Animals", "en");
    expect(blurb).toBe("Dream-pop.");
  });

  it("saveBlurb upserts without throwing", async () => {
    const sb = fakeSupabase([]) as unknown as Parameters<typeof saveBlurb>[0];
    await expect(saveBlurb(sb, "Mochakk", "en", "Late, sweaty, worth it.")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4: Run cache test to see it fail**

```bash
cd bonti && pnpm test tests/unit/blurb-cache.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 5: Implement the cache helpers**

Create `bonti/src/lib/festival/blurb-cache.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCachedBlurb(
  supabase: SupabaseClient,
  artistName: string,
  lang: "en" | "ro",
): Promise<string | null> {
  const { data, error } = await supabase
    .from("artist_blurbs")
    .select("blurb")
    .eq("artist_name", artistName)
    .eq("lang", lang)
    .maybeSingle();
  if (error) {
    console.warn("[blurb-cache] read error:", error.message);
    return null;
  }
  return data?.blurb ?? null;
}

export async function saveBlurb(
  supabase: SupabaseClient,
  artistName: string,
  lang: "en" | "ro",
  blurb: string,
): Promise<void> {
  const { error } = await supabase
    .from("artist_blurbs")
    .upsert({ artist_name: artistName, lang, blurb }, { onConflict: "artist_name,lang" });
  if (error) console.warn("[blurb-cache] write error:", error.message);
}
```

- [ ] **Step 6: Run cache test to confirm pass**

```bash
cd bonti && pnpm test tests/unit/blurb-cache.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 7: Write the integration test**

Create `bonti/tests/integration/lineup-blurb-route.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/lineup/blurb/route";

describe("/api/lineup/blurb", () => {
  it("returns a blurb for a known artist", async () => {
    const req = new Request("http://localhost/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artist: "Glass Animals", lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(5);
  }, 60_000);

  it("returns 400 on missing artist", async () => {
    const req = new Request("http://localhost/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 8: Implement the route**

Create `bonti/src/app/api/lineup/blurb/route.ts`:

```ts
import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { buildBlurbPrompt } from "@/lib/festival/prompts";
import { getCachedBlurb, saveBlurb } from "@/lib/festival/blurb-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { LINEUP } from "@/data/lineup";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { artist?: string; lang?: "en" | "ro" };

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const artist = body.artist?.trim();
  if (!artist) return new Response("Missing artist", { status: 400 });
  const lang = body.lang ?? "en";

  const sb = createAdminClient();
  const cached = await getCachedBlurb(sb, artist, lang);
  if (cached) return new Response(cached, { headers: { "content-type": "text/plain; charset=utf-8" } });

  const row = LINEUP.find(l => l.artist.toLowerCase() === artist.toLowerCase());
  if (!row) return new Response("Unknown artist", { status: 404 });

  const prompt = buildBlurbPrompt({
    artist: row.artist,
    stage: row.stage,
    day: row.day,
    ec_tags: row.ec_tags,
    lang,
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
        model, prompt, temperature: 0.5, maxRetries: 0, abortSignal: controller.signal,
      });
      clearTimeout(timer);
      const blurb = text?.trim();
      if (!blurb) throw new Error(`Empty from ${label}`);
      await saveBlurb(sb, row.artist, lang, blurb);
      return new Response(blurb, { headers: { "content-type": "text/plain; charset=utf-8" } });
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[blurb] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    `Blurb unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
```

- [ ] **Step 9: Run the integration test**

```bash
cd bonti && pnpm test tests/integration/lineup-blurb-route.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add bonti/supabase/migrations/20260524_artist_blurbs.sql bonti/src/lib/festival/blurb-cache.ts bonti/src/app/api/lineup/blurb/ bonti/tests/unit/blurb-cache.test.ts bonti/tests/integration/lineup-blurb-route.test.ts
git commit -m "feat(lineup): /api/lineup/blurb with artist_blurbs cache table"
```

---

### Task 15: `/app/lineup` page with music-match overlay

**Files:**
- Create: `bonti/src/components/lineup-row.tsx`
- Create: `bonti/src/components/artist-sheet.tsx`
- Create: `bonti/src/app/app/lineup/page.tsx`

- [ ] **Step 1: Build the lineup row**

Create `bonti/src/components/lineup-row.tsx`:

```tsx
import type { LineupEntry } from "@/data/lineup";

type Overlay = "pick" | "skip" | null;

export function LineupRow({ entry, overlay, onClick }: {
  entry: LineupEntry;
  overlay: Overlay;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b border-black/5 flex items-center gap-3 active:bg-bonti-bg"
    >
      <div className="flex-1 min-w-0">
        <p className="font-sofia uppercase text-sm tracking-wide truncate">{entry.artist}</p>
        <p className="font-roboto text-xs text-bonti-text/60 truncate">
          {entry.stage} · {entry.day}
        </p>
      </div>
      {overlay === "pick" && (
        <span className="text-[10px] font-roboto uppercase tracking-wide bg-green-100 text-green-800 rounded-full px-2 py-0.5">
          🟢 Your match
        </span>
      )}
      {overlay === "skip" && (
        <span className="text-[10px] font-roboto uppercase tracking-wide bg-red-100 text-red-800 rounded-full px-2 py-0.5">
          🔴 Skip
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Build the artist detail sheet**

Create `bonti/src/components/artist-sheet.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LineupEntry } from "@/data/lineup";

export function ArtistSheet({ entry, onClose }: { entry: LineupEntry | null; onClose: () => void }) {
  const [blurb, setBlurb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setBlurb(null);
    setLoading(true);
    fetch("/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artist: entry.artist, lang: "en" }),
    })
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setBlurb)
      .catch(() => setBlurb("Bonți's thinking… try again later."))
      .finally(() => setLoading(false));
  }, [entry]);

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-bonti-surface rounded-t-2xl p-5 pb-8 mx-auto max-w-[480px]"
          >
            <div className="w-10 h-1 bg-bonti-text/20 rounded-full mx-auto mb-4" />
            <p className="text-bonti-text/60 text-xs font-roboto uppercase">{entry.day} · {entry.stage}</p>
            <h2 className="text-bonti-text font-sofia uppercase text-2xl mt-1">{entry.artist}</h2>
            <p className="text-bonti-text/70 text-xs font-roboto mt-2">{entry.ec_tags.join(" · ")}</p>
            <p className="text-bonti-text font-roboto text-sm mt-4 min-h-[3rem]">
              {loading ? "Bonți's thinking…" : blurb}
            </p>
            <Link
              href={`/app/compass?target=main_stage`}
              className="mt-5 inline-block bg-bonti-red text-white font-sofia uppercase text-sm rounded-md px-4 py-2"
            >
              Show on compass
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Build the lineup page**

Create `bonti/src/app/app/lineup/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { LineupRow } from "@/components/lineup-row";
import { ArtistSheet } from "@/components/artist-sheet";
import { LINEUP, type LineupEntry } from "@/data/lineup";
import { createClient } from "@/lib/supabase/client";

const DAYS: LineupEntry["day"][] = ["Friday", "Saturday", "Sunday"];

type MatchOutput = {
  picks: { artist: string }[];
  skips: { artist: string }[];
};

export default function LineupPage() {
  const [day, setDay] = useState<LineupEntry["day"]>("Saturday");
  const [match, setMatch] = useState<MatchOutput | null>(null);
  const [openEntry, setOpenEntry] = useState<LineupEntry | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from("music_matches")
      .select("output, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.output) setMatch(data.output as MatchOutput);
      });
  }, []);

  const overlayFor = (entry: LineupEntry): "pick" | "skip" | null => {
    if (!match) return null;
    if (match.picks?.some(p => p.artist.toLowerCase() === entry.artist.toLowerCase())) return "pick";
    if (match.skips?.some(s => s.artist.toLowerCase() === entry.artist.toLowerCase())) return "skip";
    return null;
  };

  const filtered = useMemo(() => LINEUP.filter(e => e.day === day), [day]);

  return (
    <>
      <AppHeader title="Lineup" showBack />
      <div className="sticky top-[52px] z-20 bg-bonti-bg border-b border-black/5">
        <div className="flex">
          {DAYS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={[
                "flex-1 py-3 font-sofia uppercase text-xs tracking-wide",
                d === day ? "text-bonti-red border-b-2 border-bonti-red" : "text-bonti-text/60",
              ].join(" ")}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {!match && (
        <div className="mx-4 mt-4 bg-bonti-surface border border-black/5 rounded-xl p-3">
          <p className="font-roboto text-sm text-bonti-text">
            Match your music to get green/red on these rows. <Link href="/match" className="text-bonti-red underline">→</Link>
          </p>
        </div>
      )}

      <div>
        {filtered.map(entry => (
          <LineupRow
            key={`${entry.artist}-${entry.day}`}
            entry={entry}
            overlay={overlayFor(entry)}
            onClick={() => setOpenEntry(entry)}
          />
        ))}
      </div>

      <ArtistSheet entry={openEntry} onClose={() => setOpenEntry(null)} />
    </>
  );
}
```

- [ ] **Step 4: Visual smoke test**

```bash
cd bonti && pnpm dev
```

- Run `/match` first with a freeform playlist (e.g. "Glass Animals, Tame Impala, Mochakk, Fred again..") and let it produce picks/skips.
- Navigate to `/app/lineup`. Saturday tab is default — Glass Animals + Mochakk + Fred again.. show 🟢 Your match overlay. Subtronics (Friday) shows 🔴 Skip if it landed there.
- Tap a row → bottom sheet slides up, blurb appears after ~3-8s.
- "Show on compass" link routes to /app/compass.

- [ ] **Step 5: Commit**

```bash
git add bonti/src/components/lineup-row.tsx bonti/src/components/artist-sheet.tsx bonti/src/app/app/lineup/
git commit -m "feat(lineup): /app/lineup with day tabs + music-match overlay + artist sheet"
```

---

### Task 16: `<DensityBar>` + `/app/wait-times` page

**Files:**
- Create: `bonti/src/components/density-bar.tsx`
- Create: `bonti/src/app/app/wait-times/page.tsx`

- [ ] **Step 1: Build the density bar**

Create `bonti/src/components/density-bar.tsx`:

```tsx
type Density = "low" | "med" | "high";

const COLOR: Record<Density, string> = {
  low:  "bg-green-500",
  med:  "bg-yellow-500",
  high: "bg-red-500",
};

const WIDTH: Record<Density, string> = {
  low:  "w-1/3",
  med:  "w-2/3",
  high: "w-full",
};

export function DensityBar({ density, estimateMin }: { density: Density; estimateMin: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-bonti-bg rounded-full h-2 overflow-hidden">
        <div className={["h-full rounded-full", COLOR[density], WIDTH[density]].join(" ")} />
      </div>
      <span className="text-bonti-text font-roboto text-xs whitespace-nowrap">
        ~{estimateMin} min
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Build the wait-times page**

Create `bonti/src/app/app/wait-times/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { DensityBar } from "@/components/density-bar";
import { VENUE, QUEUE_SNAPSHOTS } from "@/data/venue";
import { useFestivalStore } from "@/lib/festival/store";
import { distanceMeters } from "@/lib/festival/compass";

export default function WaitTimesPage() {
  const maria = useFestivalStore(s => s.maria);
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [sortBy, setSortBy] = useState<"wait" | "distance">("wait");
  const [refreshing, setRefreshing] = useState(false);

  const snapshot = QUEUE_SNAPSHOTS[snapshotIdx];

  const items = VENUE
    .filter(v => snapshot[v.id])
    .map(v => ({
      v,
      ...snapshot[v.id]!,
      distance: distanceMeters(maria.coords, v.coords),
    }));

  items.sort((a, b) =>
    sortBy === "wait" ? a.estimateMin - b.estimateMin : a.distance - b.distance,
  );

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSnapshotIdx(i => (i + 1) % QUEUE_SNAPSHOTS.length);
      setRefreshing(false);
    }, 1500);
  };

  return (
    <>
      <AppHeader title="Wait Times" showBack />
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSortBy("wait")}
            className={["text-xs font-roboto px-3 py-1 rounded-full border",
              sortBy === "wait" ? "bg-bonti-toolbar text-white border-bonti-toolbar" : "border-black/10 text-bonti-text"].join(" ")}
          >By wait</button>
          <button
            type="button"
            onClick={() => setSortBy("distance")}
            className={["text-xs font-roboto px-3 py-1 rounded-full border",
              sortBy === "distance" ? "bg-bonti-toolbar text-white border-bonti-toolbar" : "border-black/10 text-bonti-text"].join(" ")}
          >By distance</button>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="text-xs font-roboto text-bonti-text underline disabled:opacity-50">
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <ul className="mt-2">
        {items.map(({ v, density, estimateMin, distance }) => (
          <li key={v.id} className="px-4 py-3 border-b border-black/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-sofia uppercase text-sm tracking-wide">{v.name}</p>
                <p className="font-roboto text-xs text-bonti-text/60">
                  {Math.round(distance)}m away · {v.kind}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <DensityBar density={density} estimateMin={estimateMin} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 3: Visual smoke test**

```bash
cd bonti && pnpm dev
```

Open `/app/wait-times`. Verify:
- Rows for each queue-able venue with a density bar (red/yellow/green) and "~N min"
- "By wait" / "By distance" toggle re-sorts
- "Refresh" → 1.5s skeleton/loading state → values change

- [ ] **Step 4: Commit**

```bash
git add bonti/src/components/density-bar.tsx bonti/src/app/app/wait-times/
git commit -m "feat(wait-times): /app/wait-times with density bars + sort + refresh"
```

---

### Task 17: `<BontiChatFAB>` + half-sheet chat overlay on subpages

**Files:**
- Create: `bonti/src/components/bonti-chat-fab.tsx`
- Modify: `bonti/src/app/app/layout.tsx` — mount the FAB on all subpages

- [ ] **Step 1: Build the chat FAB**

Create `bonti/src/components/bonti-chat-fab.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import { ChatShell } from "@/components/chat-shell";

export function BontiChatFAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide FAB on the home page (chat is already on the page) and outside /app.
  if (pathname === "/app" || !pathname.startsWith("/app")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat with Bonți"
        className="fixed z-30 right-4 bottom-20 size-14 rounded-full bg-bonti-red shadow-lg flex items-center justify-center"
      >
        <BontiAvatar size="sm" animated />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-bonti-surface rounded-t-2xl pt-3 pb-4 mx-auto max-w-[480px] flex flex-col"
              style={{ height: "70vh" }}
            >
              <div className="w-10 h-1 bg-bonti-text/20 rounded-full mx-auto" />
              <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                <p className="font-sofia uppercase text-sm">Ask Bonți</p>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-bonti-text/60">×</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatShell mode="in_festival" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Mount the FAB in the layout**

Modify `bonti/src/app/app/layout.tsx`:

```tsx
import { AppTabbar } from "@/components/app-tabbar";
import { GlobalPingToast } from "@/components/global-ping-toast";
import { BontiChatFAB } from "@/components/bonti-chat-fab";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      <main className="flex-1 mx-auto w-full max-w-[480px]">{children}</main>
      <div className="mx-auto w-full max-w-[480px]">
        <AppTabbar />
      </div>
      <GlobalPingToast />
      <BontiChatFAB />
    </div>
  );
}
```

- [ ] **Step 3: Visual smoke test**

```bash
cd bonti && pnpm dev
```

- On `/app` home — FAB hidden (chat is already in page)
- On `/app/compass`, `/app/group`, `/app/lineup`, `/app/notifications`, `/app/wait-times` — duck FAB visible bottom-right above the tab bar
- Tap FAB → half-sheet slides up with chat input; page dims; type "where's the closest beer?" → Bonti replies in-festival voice
- Tap outside or × → sheet closes

- [ ] **Step 4: Commit**

```bash
git add bonti/src/components/bonti-chat-fab.tsx bonti/src/app/app/layout.tsx
git commit -m "feat(chat): floating duck FAB with half-sheet chat overlay on subpages"
```

---

### Task 18: PWA manifest + Apple touch icons polish

**Files:**
- Create: `bonti/public/manifest.json`
- Modify: `bonti/src/app/layout.tsx` — link manifest

- [ ] **Step 1: Add the manifest**

Create `bonti/public/manifest.json`:

```json
{
  "name": "Bonți — Electric Castle 2026",
  "short_name": "Bonți",
  "description": "Your EC friend, on-site.",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F4F4F4",
  "theme_color": "#EB0000",
  "icons": [
    { "src": "/icons/bonti-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/bonti-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Wire the manifest in root metadata**

Modify `bonti/src/app/layout.tsx`. Add `manifest` to the `Metadata` export:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonți — Electric Castle 2026",
  description: "Your EC friend. From 'should I even go?' to dancing at the right stage.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/bonti-32.png",
    apple: "/icons/bonti-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "Bonți",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#EB0000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the manifest is served**

```bash
cd bonti && pnpm dev
curl -s http://localhost:3000/manifest.json | head -20
```

Expected: valid JSON with name, icons, theme_color. View source on `/app` — `<link rel="manifest" href="/manifest.json">` present.

- [ ] **Step 4: iPhone Safari "Add to Home Screen" smoke test**

(Skip if not on a real iPhone with the deployed URL; can be verified after Task 19.) On the production URL, Share → Add to Home Screen → confirm icon is the duck, launching from home screen shows the app with no Safari chrome.

- [ ] **Step 5: Commit**

```bash
git add bonti/public/manifest.json bonti/src/app/layout.tsx
git commit -m "feat(pwa): manifest.json + apple-touch + theme color"
```

---

### Task 19: Production deploy + manual verification

**Files:** none — operational task.

- [ ] **Step 1: Run the full test suite**

```bash
cd bonti && pnpm test
```

Expected: every test passes. If any test depends on a network LLM call, allow up to 60s.

- [ ] **Step 2: Run typecheck and lint**

```bash
cd bonti && pnpm tsc --noEmit && pnpm lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Build locally**

```bash
cd bonti && pnpm build
```

Expected: clean build. Note any warning about route size or static analysis — investigate before deploying.

- [ ] **Step 4: Deploy to Vercel**

```bash
cd bonti && pnpm dlx vercel --prod --yes
```

Expected: deployment READY. Note the deployment URL.

- [ ] **Step 5: Manual surface walkthrough on production**

Open the production URL on a real iPhone. For each surface, verify:

- [ ] `/app` — duck favicon visible in browser tab. Hero card shows 21:43 · Saturday. Tile grid 2×3. After 8s, Glass Animals toast slides in.
- [ ] Tap the toast → `/app/compass?target=main_stage` → compass card shows Main Stage with arrow.
- [ ] `/app/compass` — type "bathroom" → returns a bathroom venue, arrow rotates, walk time appears.
- [ ] `/app/group` — map with 4 pins visible. Tap "Let's meet up" → friends + Maria animate to a single venue (likely Banffy or EC Village).
- [ ] `/app/notifications` — 5 rows total (4 seeded + Glass Animals live ping if /app was visited). Tap "Mark all read" → opacity dims.
- [ ] `/app/lineup` — Saturday tab default. If a music match was done, green/red pills visible on matched artists. Tap any artist → blurb sheet slides up.
- [ ] `/app/wait-times` — density bars render. "Refresh" cycles values.
- [ ] On any subpage, duck FAB bottom-right opens half-sheet chat.
- [ ] Bottom tab bar always visible, active tab in red.
- [ ] Header bell badge increments when the live ping fires.

- [ ] **Step 6: Add to Home Screen verification (real iPhone)**

Share → Add to Home Screen. Confirm icon is the duck and the launched standalone app has no Safari chrome (status bar visible, no URL bar, dynamic island unobscured).

- [ ] **Step 7: Smoke-check the pre-ticket side still works**

Open `/`. Chat still functional. `/match` still functional. No regressions from the `mode` parameter change.

- [ ] **Step 8: Document the deployment in commits**

```bash
git commit --allow-empty -m "chore(deploy): plan 2 in-festival surface live on production"
```

---

## Self-review

**Spec coverage:**
- §2 Duck avatar amendment → Task 1 ✓
- §3.1 Reused code → Tasks 5, 6, 14 (chat extension, store, supabase admin) ✓
- §3.2 New code lists → all new files mapped to tasks ✓
- §3.3 Auth posture (cookie session, no required sign-in) → handled via existing supabase/server.ts; no new task needed since `/app/*` doesn't gate on auth ✓
- §3.4 Mobile shell → Task 4 ✓
- §4.1 `/app` Home → Task 6 ✓
- §4.2 `/app/compass` → Tasks 7+8 ✓
- §4.3 `/app/group` → Tasks 9+10+11 ✓
- §4.4 `/app/notifications` + live ping → Tasks 6 (setTimeout) + 12 ✓
- §4.5 `/app/lineup` → Tasks 13+14+15 ✓
- §4.6 `/app/wait-times` → Task 16 ✓
- §5 Data model → Tasks 2 + 3 ✓
- §6 LLM routes → Tasks 5, 7, 10, 14 ✓
- §7 Demo orchestration (no panel, seeded state, live ping) → enforced across Tasks 2, 6, 12 ✓
- §8 Plan 2→3 handoff (SEEDED_BROADCASTS, appendPing, no presenter-only paths) → Tasks 2, 3, 12 ✓
- §9 Voice rules → enforced via prompts.ts (Task 7), bonti-system.ts in-festival anchor (Task 5)
- §10.1 Lineup data → Task 13 (expanded to 24 artists)

**Type consistency:** `Persona`, `SeededPing`, `StoredPing`, `VenuePoint`, `CompassResult`, `ConvergeResult`, `FestivalState` all defined once and re-imported across tasks. `Mode = "pre_ticket" | "in_festival"` defined in Task 5, referenced in Task 6. `appendPing` action signature consistent across Tasks 3, 6, 12.

**Placeholder scan:** every step has runnable code or commands; no "TODO" / "TBD" / "add error handling" placeholders.

**One placeholder-shaped item that's deliberate:** Step 4 of Task 18 says "Skip if not on a real iPhone" — that's a conditional, not a missing instruction. Acceptable.

---

## Notes for the executor

- **Test environment env loading:** `bonti/tests/setup-env.ts` is already wired via `vitest.config.ts` setupFiles — every test file inherits `.env.local` automatically. Do not re-add `dotenv.config()` inside test files.
- **Free-model JSON pattern:** every new LLM route in this plan mirrors `bonti/src/lib/music-match/match-llm.ts` exactly — buffered `generateText`, JSON extract, zod parse, walk fallback chain, 503 if all fail. Do not use `streamText` and do not use `generateObject`. See memory `feedback-buffer-free-models.md` for the why.
- **Subagent + git safety:** if dispatching subagents per task, anchor every `git` command to the OUTER repo (`/Users/andrei.voic/Desktop/electric-castle-cluj-ai-buildathon/.git`). The Plan 1 execution accidentally created a `bonti/.git` repo and split history. See memory `feedback-subagent-split-repo.md`.
- **No backstage controls:** Plan 2's design explicitly forbids hidden trigger panels or wizard-of-oz scrubbers. The single live moment is the `setTimeout` in Task 6 Step 6. See memory `feedback-demos-are-product-not-theater.md`.
- **Existing chat fix is canonical:** when extending `/api/chat` in Task 5, keep the existing buffered-`generateText` + fallback chain. Do not regress to streaming.
