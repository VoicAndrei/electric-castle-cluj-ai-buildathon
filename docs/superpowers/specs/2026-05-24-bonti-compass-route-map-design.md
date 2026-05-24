# Bonți — Compass v2: Route Map + Live Compass Polish

> Refinement to the `/app/compass` surface. Adds a venue-map view with a route from the user to the target, and tightens the existing phone-heading integration so the live compass reads clearly on first use.
>
> **Design date:** 2026-05-24. **Parent spec:** `2026-05-24-bonti-in-festival-design.md` §6 (Compass surface).

---

## 1. Goal & non-goals

**Goal.** When the Compass returns a target, the user should see *both* the at-a-glance arrow card *and* a map of the venue with their position, the target, and the route between them. The phone's real compass should drive the arrow visibly enough that users notice they can turn the phone to navigate.

**Non-goals.**
- No real GPS / no real geographic map. Coords remain the synthetic 0..1000 space anchored to `ec-map.png`. We are not introducing lat/lng, OpenStreetMap, Mapbox, or any external map provider.
- No real walking-path routing. The route is a straight line — honest about the abstract coord system.
- No map-rotation "compass mode" (Google Maps style). Map stays north-up; arrow card carries the heading signal.
- No `MAP_NORTH_OFFSET_DEG` calibration constant. The venue is synthetic; calibrating to true north would be theater.
- No changes to `/api/compass`, the prompt, the deep-link flow, or the LLM contract. Pure presentation layer.

## 2. Architecture & scope

### 2.1 Reused (no new code)

- `bonti/src/components/venue-map.tsx` — gains one optional prop (`overlay`); no behavioral change to existing call sites
- `bonti/src/components/compass-card.tsx` — gains one small permission-nudge line; arrow rotation logic unchanged
- `bonti/src/hooks/use-device-heading.ts` — unchanged
- `bonti/src/lib/festival/compass.ts` — unchanged
- `bonti/src/app/app/compass/page.tsx` — mounts the new component below the card

### 2.2 New code

- `bonti/src/components/compass-route-map.tsx` — wraps `VenueMap`, owns the SVG route line, user pin, target pin, distance pill, and the optional north-rose

## 3. Component design

### 3.1 `VenueMap` — one new prop

Add `overlay?: ReactNode` to the existing `Props`. The overlay renders **inside** the transformed `<div>` that already holds the pins, anchored to the same 0..1000 percent canvas. Render order: image → pins → overlay. No other change to `VenueMap`; existing `/app/group` usage is unaffected.

### 3.2 `CompassRouteMap`

Props:

```ts
type Props = {
  target: VenuePoint;
  from: { x: number; y: number };
};
```

Renders a single `<VenueMap>` with `pins={[]}` and an `overlay` containing:

1. **Route line** — a `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none">` filling the canvas. One `<line>` with endpoints at `from` and `target.coords`. Stroke: `#EB0000` (bonti-red), width 6, `stroke-linecap="round"`, `stroke-dasharray="14 18"`. Class `route-dash` animates `stroke-dashoffset` so the dashes flow user→target.
2. **User pin** — `🦋` (matches `MARIA.avatar_emoji` in `festival-state.ts`), white ring, size 36px, subtle pulse animation. Positioned absolutely at `from.{x,y}` percent-of-1000.
3. **Target pin** — emoji chosen by `target.kind` (`stage` → 🎤, `beer` → 🍺, `food` → 🍕, `bathroom` → 🚻, `beach` → 🏖️, `campsite` → ⛺, `village` → 🏘️, `shuttle` → 🚌, `first_aid` → ⛑️). White ring, size 36px. Positioned at `target.coords`.
4. **Distance pill** — small absolutely-positioned `<div>` at the midpoint of the route. Text: `${distanceMeters(from, target.coords)|round}m · ${formatWalkTime(...)}`. White background, dark text, tiny shadow. Stays upright when the map zooms (does not transform with the SVG).
5. **North-rose (conditional)** — when `heading != null`, a 32px circle pinned to the map's top-left corner with "N" on the rim, rotated by `-heading` degrees so N always points to real north as the phone turns. Hidden when no heading.

Z-order: route line → pins → distance pill → north-rose.

### 3.3 Animation

Single CSS rule (added to `bonti/src/app/globals.css`):

```css
@keyframes route-flow {
  to { stroke-dashoffset: -32; }
}
.route-dash {
  animation: route-flow 1.2s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .route-dash { animation: none; }
}
```

User-pin pulse uses an existing or inline `animate-pulse` equivalent — keep it subtle, 2s cycle. Respect `prefers-reduced-motion`.

### 3.4 `CompassCard` permission nudge

Currently the "Enable live compass" button only renders when `supported && permission === "default"`. On Android/desktop, `permission` jumps straight to `"granted"` and the button never appears — that's correct. On iOS Safari before the user has interacted, the prompt is the *only* path to a live heading.

Add a one-line caption directly under the arrow on iOS pre-grant:

> "Tap **Enable live compass** to point your phone at the target."

Same conditional (`supported && permission === "default"`). Below the arrow, above the title — small, italic, `text-bonti-text/60`. Removed once permission resolves.

This is purely a copy/visibility change. No new state, no new effect.

## 4. `/app/compass/page.tsx` integration

Below the existing `<CompassCard>` block, conditionally render:

```tsx
{result && (
  <CompassRouteMap
    target={result.target}
    from={maria.coords}
  />
)}
```

Wrap in a top-margin (e.g. `mt-4 mx-4`) so it lines up with the card. Loading and error states unchanged.

## 5. Coord-system notes

`VenueMap` already converts 0..1000 coords to `left/top` percents via `coords.x / 10`. The route SVG uses the same 1000-unit canvas (`viewBox="0 0 1000 1000" preserveAspectRatio="none"`), so endpoints can be written as raw `from.x` / `from.y` without conversion. The SVG and the pin divs end up perfectly aligned because both stretch over the same letterboxed map area (`object-cover` + `aspect-ratio: 5236/3071`).

The pins inside `CompassRouteMap`'s overlay are positioned with the same `left: ${x/10}%; top: ${y/10}%; translate(-50%, -50%)` pattern `VenueMap` uses internally. We do not pass `pins` to `VenueMap` — we render our own pins inside `overlay` to control z-order relative to the route line.

## 6. Files touched

| File | Change |
|------|--------|
| `bonti/src/app/app/compass/page.tsx` | Mount `<CompassRouteMap>` below the card |
| `bonti/src/components/compass-card.tsx` | Add iOS permission-nudge caption |
| `bonti/src/components/venue-map.tsx` | Add `overlay?: ReactNode` prop |
| `bonti/src/components/compass-route-map.tsx` | **New** — route map component |
| `bonti/src/app/globals.css` | Add `@keyframes route-flow` and `.route-dash` |

## 7. Testing notes

- Desktop: open `/app/compass`, run a query, confirm the card renders, the map appears below, the route line connects user pin → target pin, the dashes animate, the distance pill sits at the midpoint, no north-rose (no phone heading).
- Mobile (iOS Safari): same flow, tap "Enable live compass", grant permission, confirm the arrow rotates as the phone turns and the north-rose appears on the map and counter-rotates.
- Mobile (Android Chrome): heading available immediately on supported devices; nudge does not appear; north-rose appears once `heading != null`.
- Deep link: `/app/compass?target=beach_stage` should resolve directly into the card + map without typing a query.
- Reduced motion: dashes stop animating; pulse stops; static layout still readable.

## 8. Out of scope (deferred)

- Hand-drawn waypoint paths along the EC walkways
- True-north calibration via `MAP_NORTH_OFFSET_DEG`
- Map-rotation "compass mode"
- Re-centering / auto-fit on the route (the map starts at scale=1 showing the full venue, which already shows both endpoints for any reasonable target)
- Distance-pill placement avoidance when route is very short (overlap with pins) — acceptable visual edge case at hackathon polish level
