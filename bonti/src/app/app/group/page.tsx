"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { VenueMap } from "@/components/venue-map";
import { useFestivalStore } from "@/lib/festival/store";
import { findVenueById } from "@/lib/festival/compass";

export default function GroupPage() {
  const maria = useFestivalStore(s => s.maria);
  const friends = useFestivalStore(s => s.friends);
  const groupMeeting = useFestivalStore(s => s.group_meeting);
  const applyGroupConverge = useFestivalStore(s => s.applyGroupConverge);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLine, setResultLine] = useState<string | null>(null);

  const pins = [
    { id: maria.id,   coords: maria.coords,   color: "#EB0000", label: maria.name[0] },
    ...friends.map(f => ({ id: f.id, coords: f.coords, color: "#0A0A0A", label: f.name[0] })),
  ];

  const meet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/group/converge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          positions: [
            { id: maria.id,   name: maria.name,   coords: maria.coords },
            ...friends.map(f => ({ id: f.id, name: f.name, coords: f.coords })),
          ],
          lang: "en",
        }),
      });
      if (!res.ok) throw new Error(`Converge unavailable (${res.status})`);
      const body = await res.json();
      const target = findVenueById(body.meeting_point_id);
      if (!target) throw new Error(`Unknown venue: ${body.meeting_point_id}`);
      applyGroupConverge({
        meeting_point_id: body.meeting_point_id,
        eta_min: body.eta_min,
        reason: body.reason,
        target_coords: target.coords,
      });
      setResultLine(body.en);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader title="Group" showBack />
      <div className="px-4 pt-4">
        <p className="text-bonti-text font-roboto text-sm">
          👥 Group of {friends.length + 1}
          {groupMeeting ? ` · meeting at ${findVenueById(groupMeeting.point_id)?.name ?? "?"}` : " · spread across the venue"}
        </p>
      </div>
      <div className="px-4 pt-4">
        <VenueMap pins={pins} highlight={groupMeeting?.point_id} />
      </div>

      <div className="px-4 pt-4">
        {!groupMeeting ? (
          <button
            type="button"
            onClick={meet}
            disabled={loading}
            className="w-full bg-bonti-red text-white font-sofia uppercase tracking-wide rounded-lg py-3 disabled:opacity-50"
          >
            {loading ? "Bonți's thinking…" : "Let's meet up"}
          </button>
        ) : (
          <div className="bg-bonti-surface border border-black/5 rounded-xl p-4">
            <p className="text-bonti-text font-sofia uppercase text-sm">
              ETA {groupMeeting.eta_min} min
            </p>
            <p className="text-bonti-text font-roboto text-sm mt-1">{groupMeeting.reason}</p>
            {resultLine && (
              <p className="text-bonti-text/70 font-roboto text-xs italic mt-2">
                Bonți pushed: &ldquo;{resultLine}&rdquo;
              </p>
            )}
          </div>
        )}
        {error && (
          <div className="mt-3 bg-bonti-surface border border-bonti-red/50 rounded-xl p-3">
            <p className="text-bonti-red text-sm font-roboto">{error}</p>
            <button onClick={meet} className="mt-2 text-xs font-roboto underline text-bonti-text">
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
