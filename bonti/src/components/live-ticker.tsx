"use client";

import { useFestivalStore } from "@/lib/festival/store";

export function LiveTicker() {
  const latest = useFestivalStore(s => {
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
