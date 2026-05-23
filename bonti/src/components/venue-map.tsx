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
