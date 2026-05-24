"use client";

import Image from "next/image";

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
  className?: string;
};

/**
 * The EC11 festival map (the real isometric illustration EC publishes each
 * year) is the backdrop. Friend pins float on top at percent coordinates
 * derived from the 1000-unit positions stored in festival-state.
 */
export function VenueMap({ pins = [], className }: Props) {
  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-xl border border-black/5 bg-[#0b3c1e]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: "5236 / 3071" }}
      role="img"
      aria-label="Electric Castle venue map with friend positions"
    >
      <Image
        src="/ec-map.png"
        alt=""
        fill
        priority
        sizes="(max-width: 480px) 100vw, 480px"
        className="object-cover select-none pointer-events-none"
        draggable={false}
      />

      {pins.map((p) => {
        const leftPct = p.coords.x / 10;
        const topPct = p.coords.y / 10;
        const size = p.size ?? 28;
        return (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_white,0_2px_6px_rgba(0,0,0,0.4)] flex items-center justify-center font-sofia text-xs font-bold text-white transition-[left,top] duration-[1.5s] ease-in-out"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: size,
              height: size,
              backgroundColor: p.color ?? "#0A0A0A",
            }}
          >
            {p.label}
          </div>
        );
      })}
    </div>
  );
}
