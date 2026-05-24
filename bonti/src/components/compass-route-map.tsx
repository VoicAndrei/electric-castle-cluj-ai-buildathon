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
