# Compass v2 — Route Map + Live Compass Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a venue-map route view below the existing arrow card on `/app/compass`, plus a one-line iOS permission nudge so the live phone compass is discoverable.

**Architecture:** Extend `VenueMap` with a single `overlay` prop, then build a new `CompassRouteMap` component that wraps it with a dashed/animated SVG route line, two emoji pins (user + target), a distance pill, and an optional north-rose driven by `useDeviceHeading`. No new dependencies. No coord-system changes — everything operates in the existing 0..1000 percent-of-`ec-map.png` space.

**Tech Stack:** Next.js 16 (App Router) in `bonti/`, Tailwind v4, React 19, `react-zoom-pan-pinch` (already installed via `VenueMap`), Vitest for pure-logic unit tests (no React component tests — matches project convention).

**Spec:** `docs/superpowers/specs/2026-05-24-bonti-compass-route-map-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `bonti/src/components/venue-map.tsx` | modify | Add optional `overlay` slot inside the transformed canvas |
| `bonti/src/app/globals.css` | modify | Add `@keyframes route-flow` + `.animate-route-flow` utility |
| `bonti/src/lib/festival/venue-emoji.ts` | create | Pure mapping from `VenueKind` to display emoji |
| `bonti/tests/unit/venue-emoji.test.ts` | create | Vitest: every `VenueKind` resolves to an emoji |
| `bonti/src/components/compass-route-map.tsx` | create | Route map: pins, SVG line, distance pill, north-rose |
| `bonti/src/app/app/compass/page.tsx` | modify | Mount `CompassRouteMap` below `CompassCard` |
| `bonti/src/components/compass-card.tsx` | modify | One-line iOS permission caption under the arrow |

All `bonti/`-relative — agent must `cd bonti` (or use `cd bonti && ...`) for `npm test`. Anchor `git` calls to the outer repo root (commands below already use repo-root-relative paths).

---

## Task 1: Extend `VenueMap` with an `overlay` slot

**Files:**
- Modify: `bonti/src/components/venue-map.tsx`

This is a pure additive change. Existing call sites (`/app/group` friend pins) keep working — they don't pass `overlay`, so nothing renders in the new slot.

- [ ] **Step 1: Add `overlay` to `Props`**

In `bonti/src/components/venue-map.tsx`, update the import and `Props` type:

```tsx
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";

type Pin = {
  id: string;
  /** 0-1000 grid (x), 0-1000 grid (y). Rendered as % of the map. */
  coords: { x: number; y: number };
  label?: string;
  color?: string;
  size?: number;
};

type Props = {
  pins?: Pin[];
  /** Reserved for future use — kept in API so Group page compiles. */
  highlight?: string;
  routeFrom?: { x: number; y: number };
  /**
   * Optional overlay rendered inside the same transformed canvas as the pins.
   * Use this for route lines, custom pins, or any content that should pan/zoom
   * with the map. Sits *above* the default pins in z-order.
   */
  overlay?: ReactNode;
  className?: string;
};
```

- [ ] **Step 2: Render the overlay after the pins**

Inside the existing `pins.map(...)` block in `VenueMap`, add the overlay render directly after the closing brace of the map. The existing structure is:

```tsx
<Image ... />
{pins.map((p) => { ... })}
```

Change it to:

```tsx
<Image ... />
{pins.map((p) => { ... })}
{overlay}
```

Place `{overlay}` as a sibling of the pins inside the `<div className="relative w-full h-full" role="img" ...>` container.

- [ ] **Step 3: Destructure `overlay` from props**

Update the function signature line:

```tsx
export function VenueMap({ pins = [], overlay, className }: Props) {
```

- [ ] **Step 4: Type-check**

Run from the outer repo root:

```bash
cd bonti && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add bonti/src/components/venue-map.tsx
git commit -m "feat(venue-map): add overlay slot for custom in-canvas content"
```

---

## Task 2: Add `route-flow` keyframes to `globals.css`

**Files:**
- Modify: `bonti/src/app/globals.css` (append near existing `bonti-bob` / `bonti-shimmer` keyframes, before the `@layer utilities` block)

- [ ] **Step 1: Append keyframes and utility**

Open `bonti/src/app/globals.css`. After the existing `.animate-bonti-shimmer` block (around line 213) and **before** the `@layer utilities` block, insert:

```css
@keyframes route-flow {
  to { stroke-dashoffset: -32; }
}
.animate-route-flow {
  animation: route-flow 1.2s linear infinite;
}

@keyframes route-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 1;   }
  50%      { transform: translate(-50%, -50%) scale(1.15); opacity: 0.85; }
}
.animate-route-pulse {
  animation: route-pulse 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-route-flow,
  .animate-route-pulse { animation: none; }
}
```

`route-pulse` preserves the `translate(-50%, -50%)` centering that the user pin needs (since the pin is positioned with `left/top` percents and centered via translate). Setting the transform from inside the keyframe would otherwise clobber the centering.

- [ ] **Step 2: Verify the CSS still parses**

```bash
cd bonti && npx next build --experimental-build-mode=compile 2>&1 | head -40
```

Expected: no CSS errors. (If the full build is too slow on the hackathon machine, skip and rely on the dev-server check in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add bonti/src/app/globals.css
git commit -m "feat(globals): add route-flow and route-pulse keyframes for compass route map"
```

---

## Task 3: `VenueKind` → emoji helper + unit test

**Files:**
- Create: `bonti/src/lib/festival/venue-emoji.ts`
- Test: `bonti/tests/unit/venue-emoji.test.ts`

The mapping is pure data and tiny, but a unit test guards against adding a new `VenueKind` to `bonti/src/data/venue.ts` without updating the map.

- [ ] **Step 1: Write the failing test**

Create `bonti/tests/unit/venue-emoji.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VENUE } from "@/data/venue";
import { emojiForKind, KIND_EMOJI } from "@/lib/festival/venue-emoji";

describe("venue-emoji", () => {
  it("has an emoji for every VenueKind present in the venue list", () => {
    for (const v of VENUE) {
      expect(KIND_EMOJI[v.kind], `missing emoji for kind=${v.kind}`).toBeTruthy();
    }
  });

  it("emojiForKind returns the mapped emoji", () => {
    expect(emojiForKind("beer")).toBe("🍺");
    expect(emojiForKind("food")).toBe("🍕");
    expect(emojiForKind("bathroom")).toBe("🚻");
    expect(emojiForKind("stage")).toBe("🎤");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd bonti && npx vitest run tests/unit/venue-emoji.test.ts
```

Expected: FAIL — module `@/lib/festival/venue-emoji` does not exist.

- [ ] **Step 3: Create the helper**

Create `bonti/src/lib/festival/venue-emoji.ts`:

```ts
import type { VenueKind } from "@/data/venue";

export const KIND_EMOJI: Record<VenueKind, string> = {
  stage:     "🎤",
  beer:      "🍺",
  food:      "🍕",
  bathroom:  "🚻",
  beach:     "🏖️",
  campsite:  "⛺",
  village:   "🏘️",
  shuttle:   "🚌",
  first_aid: "⛑️",
};

export function emojiForKind(kind: VenueKind): string {
  return KIND_EMOJI[kind];
}
```

The `Record<VenueKind, string>` type forces TypeScript to fail at compile-time if `VenueKind` gains a new variant — belt-and-suspenders with the runtime test.

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd bonti && npx vitest run tests/unit/venue-emoji.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add bonti/src/lib/festival/venue-emoji.ts bonti/tests/unit/venue-emoji.test.ts
git commit -m "feat(festival): add VenueKind → emoji map with coverage test"
```

---

## Task 4: Build `CompassRouteMap`

**Files:**
- Create: `bonti/src/components/compass-route-map.tsx`

The biggest task. Mount it once the prerequisites (Task 1 overlay, Task 2 keyframes, Task 3 emoji helper) are in place.

- [ ] **Step 1: Create the component file**

Create `bonti/src/components/compass-route-map.tsx` with the complete contents below:

```tsx
"use client";

import { VenueMap } from "@/components/venue-map";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { distanceMeters, formatWalkTime } from "@/lib/festival/compass";
import { emojiForKind } from "@/lib/festival/venue-emoji";
import { MARIA } from "@/data/festival-state";
import type { VenuePoint } from "@/data/venue";

type Props = {
  target: VenuePoint;
  from: { x: number; y: number };
};

/**
 * Route view that lives below the CompassCard on /app/compass. Reuses the
 * generic VenueMap as a backdrop and supplies a custom overlay with:
 *   - SVG line from user → target (dashed, animated flow)
 *   - User pin (Maria's avatar emoji) and target pin (kind emoji)
 *   - Distance + walk-time pill anchored at the midpoint
 *   - North-rose in the corner that counter-rotates with phone heading
 *
 * The SVG uses viewBox="0 0 1000 1000" preserveAspectRatio="none" so it
 * stretches across the same letterboxed canvas that the pins percent-position
 * themselves over. That means line endpoints can be written as raw coord
 * values without conversion.
 */
export function CompassRouteMap({ target, from }: Props) {
  const { heading } = useDeviceHeading();

  const distance = distanceMeters(from, target.coords);
  const midX = (from.x + target.coords.x) / 2;
  const midY = (from.y + target.coords.y) / 2;

  const userLeft = `${from.x / 10}%`;
  const userTop = `${from.y / 10}%`;
  const targetLeft = `${target.coords.x / 10}%`;
  const targetTop = `${target.coords.y / 10}%`;
  const pillLeft = `${midX / 10}%`;
  const pillTop = `${midY / 10}%`;

  const overlay = (
    <>
      {/* Route line — SVG fills the same canvas as the pins */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        <line
          x1={from.x}
          y1={from.y}
          x2={target.coords.x}
          y2={target.coords.y}
          stroke="#EB0000"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="14 18"
          className="animate-route-flow"
        />
      </svg>

      {/* User pin */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 size-9 rounded-full bg-white shadow-[0_0_0_3px_white,0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center text-lg animate-route-pulse pointer-events-none"
        style={{ left: userLeft, top: userTop }}
        aria-label="Your position"
      >
        <span>{MARIA.avatar_emoji}</span>
      </div>

      {/* Target pin */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 size-9 rounded-full bg-bonti-red shadow-[0_0_0_3px_white,0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center text-lg pointer-events-none"
        style={{ left: targetLeft, top: targetTop }}
        aria-label={`Target: ${target.name}`}
      >
        <span>{emojiForKind(target.kind)}</span>
      </div>

      {/* Distance pill at the midpoint */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 bg-white text-bonti-text font-roboto text-[11px] font-medium px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none"
        style={{ left: pillLeft, top: pillTop }}
      >
        {Math.round(distance)}m · {formatWalkTime(distance)}
      </div>

      {/* North-rose — only when we actually have a phone heading */}
      {heading != null && (
        <div
          className="absolute top-2 left-2 size-8 rounded-full bg-white/90 border border-black/10 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[10px] font-sofia text-bonti-red">N</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-4 mt-4">
      <VenueMap pins={[]} overlay={overlay} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd bonti && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add bonti/src/components/compass-route-map.tsx
git commit -m "feat(compass): add CompassRouteMap with animated route line and pins"
```

---

## Task 5: Mount `CompassRouteMap` in the compass page

**Files:**
- Modify: `bonti/src/app/app/compass/page.tsx`

- [ ] **Step 1: Import the new component**

In `bonti/src/app/app/compass/page.tsx`, add the import next to the existing `CompassCard` import:

```tsx
import { CompassCard } from "@/components/compass-card";
import { CompassRouteMap } from "@/components/compass-route-map";
```

- [ ] **Step 2: Render it below the card**

Find the existing block (around line 125):

```tsx
{result && (
  <CompassCard
    target={result.target}
    from={maria.coords}
    reason={result.reason}
    line_state={result.line_state}
    bontiLine={result.bontiLine}
  />
)}
```

Add immediately after:

```tsx
{result && (
  <CompassRouteMap target={result.target} from={maria.coords} />
)}
```

Keep the conditions as two separate `{result && ...}` blocks so future divergence (different gates per surface) stays trivial.

- [ ] **Step 3: Type-check**

```bash
cd bonti && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add bonti/src/app/app/compass/page.tsx
git commit -m "feat(compass): mount route map below arrow card"
```

---

## Task 6: Add iOS permission nudge to `CompassCard`

**Files:**
- Modify: `bonti/src/components/compass-card.tsx`

The "Enable live compass" button already appears when `supported && permission === "default"`. The nudge is a small italic caption placed under the arrow circle so iOS users connect *the arrow they're staring at* with the button below the card.

- [ ] **Step 1: Add the caption block**

In `bonti/src/components/compass-card.tsx`, locate the arrow circle `<div className="size-20 shrink-0 ...">...</div>` ending at line ~48 (the wrapper containing the SVG and the `N` marker).

The current structure (around lines 31–48):

```tsx
<div className="flex items-start gap-4">
  <div
    className="size-20 shrink-0 rounded-full bg-bonti-bg border border-black/10 relative flex items-center justify-center"
    aria-label={`Bearing ${Math.round(bearing)} degrees`}
  >
    {/* North marker + SVG arrow + live badge */}
  </div>
  <div className="flex-1 min-w-0">
    {/* title/kind/distance */}
  </div>
</div>
```

The `needsPermission` derivation already exists at line ~28: `const needsPermission = supported && permission === "default";`. We just need a tiny text line that appears when `needsPermission` is true, placed *between* the top row (arrow + title) and the existing `<p className="text-bonti-text font-roboto text-sm mt-3 ...">{bontiLine}</p>`.

Insert directly after the closing `</div>` of the top flex row (and before the `{bontiLine}` paragraph):

```tsx
{needsPermission && (
  <p className="mt-2 text-bonti-text/60 font-roboto text-xs italic">
    Tap <span className="not-italic font-medium">Enable live compass</span> to point your phone at the target.
  </p>
)}
```

- [ ] **Step 2: Type-check**

```bash
cd bonti && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add bonti/src/components/compass-card.tsx
git commit -m "feat(compass-card): nudge iOS users toward the live-compass button"
```

---

## Task 7: Manual verification

**Files:** none — this task only runs the app and exercises it.

The spec's §7 testing notes are manual/visual; the project has no React component tests by convention. This task is the gate before considering the work shipped.

- [ ] **Step 1: Start the dev server**

```bash
cd bonti && npm run dev
```

Wait for "Ready". Note: project uses Turbopack — first-load can take ~10s.

- [ ] **Step 2: Desktop smoke test**

Open http://localhost:3000/app/compass. Run a query (click a chip, e.g. "🍺 Beer"). Confirm:
- The arrow card renders with the existing layout
- A map appears below the card showing the EC venue illustration
- Two pins are visible: 🦋 (user, near `(500, 600)`) and a kind emoji (target)
- A dashed red line connects them
- The dashes flow from user → target (slow continuous motion)
- A small white pill at the midpoint shows distance and walk time
- No north-rose (desktop has no `deviceorientation` events)
- Zoom/pan still works (pinch trackpad, scroll wheel, drag)

- [ ] **Step 3: Deep-link test**

Open http://localhost:3000/app/compass?target=beach_stage. Confirm: card and map render immediately (no typing), route line goes from Maria's position to the Beach Stage pin in the south-west.

- [ ] **Step 4: iOS Safari smoke test** *(if a physical iPhone is reachable)*

Open the same URL on the phone (over the local network — Next dev server binds to all interfaces by default). Confirm:
- Under the arrow, the italic nudge reads "Tap **Enable live compass** to point your phone at the target."
- Tap the existing "Enable live compass" button. iOS prompts for motion/orientation permission.
- Grant it. The nudge disappears, the arrow gains the "live" badge, and the arrow rotates as you turn the phone.
- A small north-rose appears in the map's top-left corner and counter-rotates so "N" points to real north as you turn.

- [ ] **Step 5: Android Chrome smoke test** *(if reachable)*

On Android, the listener attaches without a prompt; the nudge should not appear; the north-rose should appear once heading is available.

- [ ] **Step 6: Reduced-motion sanity**

In macOS System Settings → Accessibility → Display, enable "Reduce motion" (or use Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`). Reload `/app/compass` and confirm:
- Route dashes are static (no flow)
- User pin no longer pulses
- Layout otherwise unchanged

- [ ] **Step 7: Regression — `/app/group` unaffected**

Open http://localhost:3000/app/group and confirm the friend-pins map still renders correctly and pans/zooms. This validates the `VenueMap` overlay change is backward-compatible.

- [ ] **Step 8: Final commit (only if any fix-ups were needed during verification)**

If steps 2–7 surfaced bugs, fix them and commit with a `fix(compass): ...` message. Otherwise this task produces no commit.

---

## Done criteria

- All 7 tasks above committed (Task 7 may produce zero commits if verification passes clean).
- `cd bonti && npx tsc --noEmit` — clean.
- `cd bonti && npm test` — all existing tests still green, plus the new `venue-emoji.test.ts` green.
- `/app/compass` shows the route map below the card on desktop.
- iOS permission nudge text appears for users who haven't granted motion permission yet.
