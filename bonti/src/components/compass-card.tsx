"use client";

import { useState } from "react";
import { distanceMeters, bearingDegrees, formatWalkTime } from "@/lib/festival/compass";
import { useDeviceHeading } from "@/hooks/use-device-heading";
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
  const { heading, permission, supported, requestPermission } = useDeviceHeading();

  const m = distanceMeters(from, target.coords);
  const bearing = bearingDegrees(from, target.coords);
  // Arrow rotation: rotate the arrow against the user's current heading so it
  // always points at the target as the phone turns. If we have no heading,
  // just show the absolute bearing (good enough for desktop demo).
  const arrowRotation = heading == null ? bearing : (bearing - heading + 360) % 360;

  const needsPermission = supported && permission === "default";

  return (
    <div className="bg-bonti-surface border border-black/5 rounded-xl p-4 mx-4 mt-4">
      <div className="flex items-start gap-4">
        <div
          className="size-20 shrink-0 rounded-full bg-bonti-bg border border-black/10 relative flex items-center justify-center"
          aria-label={`Bearing ${Math.round(bearing)} degrees`}
        >
          {/* North marker on the rim */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-sofia text-bonti-text/60">N</span>
          <svg
            viewBox="0 0 100 100"
            className="size-14 transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${arrowRotation}deg)` }}
          >
            <polygon points="50,8 64,80 50,68 36,80" fill="#EB0000" />
          </svg>
          {heading != null && (
            <span className="absolute -bottom-1 right-0 bg-bonti-red text-white text-[9px] font-sofia uppercase px-1 rounded">live</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-bonti-text/60 text-xs font-roboto">{target.kind}</p>
          <h2 className="text-bonti-text font-sofia uppercase text-lg leading-tight">{target.name}</h2>
          <p className="text-bonti-text font-roboto text-sm mt-1">
            {Math.round(m)}m · {formatWalkTime(m)} · <span className="opacity-70">{line_state}</span>
          </p>
        </div>
      </div>
      {needsPermission && (
        <p className="mt-2 text-bonti-text/60 font-roboto text-xs italic">
          Tap <span className="not-italic font-medium">Enable live compass</span> to point your phone at the target.
        </p>
      )}
      <p className="text-bonti-text font-roboto text-sm mt-3 leading-snug">{bontiLine}</p>

      {needsPermission && (
        <button
          type="button"
          onClick={requestPermission}
          className="mt-3 w-full bg-bonti-red text-white font-sofia uppercase tracking-wide rounded-lg py-2 text-sm"
        >
          Enable live compass
        </button>
      )}
      {permission === "denied" && (
        <p className="mt-3 text-bonti-text/60 text-xs font-roboto italic">
          Compass permission denied. The arrow shows the static bearing only.
        </p>
      )}

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
