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
