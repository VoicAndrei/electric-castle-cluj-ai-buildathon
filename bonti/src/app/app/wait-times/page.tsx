"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { DensityBar } from "@/components/density-bar";
import { VENUE, QUEUE_SNAPSHOTS } from "@/data/venue";
import { useFestivalStore } from "@/lib/festival/store";
import { distanceMeters } from "@/lib/festival/compass";
import { useEventLogger } from "@/hooks/use-event-logger";

export default function WaitTimesPage() {
  const maria = useFestivalStore(s => s.maria);
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [sortBy, setSortBy] = useState<"wait" | "distance">("wait");
  const [refreshing, setRefreshing] = useState(false);
  const log = useEventLogger();

  useEffect(() => {
    log("wait_times_view", { sort: sortBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

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
