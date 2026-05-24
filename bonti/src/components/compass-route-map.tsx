"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useTransformComponent } from "react-zoom-pan-pinch";
import { VenueMap } from "@/components/venue-map";
import { distanceMeters, formatWalkTime } from "@/lib/festival/compass";
import { emojiForKind } from "@/lib/festival/venue-emoji";
import { MARIA } from "@/data/festival-state";
import type { VenuePoint } from "@/data/venue";

type Props = {
  target: VenuePoint;
  from: { x: number; y: number };
  heading: number | null;
};

/**
 * Route view that lives below the CompassCard on /app/compass. Reuses the
 * generic VenueMap as a backdrop and supplies a custom overlay with:
 *   - SVG line from user → target (dashed, animated flow)
 *   - User pin (Maria's avatar emoji) and target pin (kind emoji)
 *   - Distance + walk-time pill anchored at the midpoint
 *   - North-rose in the corner that counter-rotates with phone heading (when supplied)
 *
 * The SVG uses viewBox="0 0 1000 1000" preserveAspectRatio="none" so it
 * stretches across the same letterboxed canvas that the pins percent-position
 * themselves over. That means line endpoints can be written as raw coord
 * values without conversion.
 *
 * `heading` is a prop (not consumed from useDeviceHeading directly) so the
 * compass page can share a single hook instance with CompassCard. iOS only
 * grants deviceorientation permission via an explicit user gesture, and
 * that gesture lives in CompassCard — without lifting state, this
 * component would never receive a heading on iOS.
 */
type CounterScaledProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Wraps an absolute-positioned element so it keeps a constant visual size as
 * the parent VenueMap zooms. The element's CSS `transform` is owned here, so
 * callers should not pass their own `translate-*` utility classes.
 */
function CounterScaled({ style, children, ...rest }: CounterScaledProps) {
  const scale = useTransformComponent(({ state }) => state.scale);
  return (
    <div
      {...rest}
      style={{
        ...style,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  );
}

export function CompassRouteMap({ target, from, heading }: Props) {
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
      {/* Route line — SVG fills the same canvas as the pins. The line is
          allowed to scale with the map so its endpoints stay glued to the
          user + target coords; only the pin/pill chrome counter-scales. */}
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
          strokeDashoffset={0}
          className="animate-route-flow"
        />
      </svg>

      <CounterScaled
        className="absolute pointer-events-none"
        style={{ left: userLeft, top: userTop }}
        aria-label="Your position"
      >
        <div className="size-9 rounded-full bg-bonti-red shadow-[0_0_0_3px_white,0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center font-sofia text-xs font-bold text-white animate-route-pulse">
          <span>{MARIA.name[0]}</span>
        </div>
      </CounterScaled>

      <CounterScaled
        className="absolute size-9 rounded-full bg-bonti-red shadow-[0_0_0_3px_white,0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center text-lg pointer-events-none"
        style={{ left: targetLeft, top: targetTop }}
        aria-label={`Target: ${target.name}`}
      >
        <span>{emojiForKind(target.kind)}</span>
      </CounterScaled>

      <CounterScaled
        className="absolute bg-white text-bonti-text font-roboto text-[11px] font-medium px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none"
        style={{ left: pillLeft, top: pillTop }}
      >
        {Math.round(distance)}m · {formatWalkTime(distance)}
      </CounterScaled>

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
