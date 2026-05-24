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
  const setManualMeeting = useFestivalStore(s => s.setManualMeeting);
  const clearMeeting = useFestivalStore(s => s.clearMeeting);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLine, setResultLine] = useState<string | null>(null);
  // Tapping the map only previews a candidate; the meeting isn't committed
  // until the user presses "Meet here". Cleared once a meeting commits or
  // the user cancels the candidate.
  const [pendingManual, setPendingManual] = useState<{ x: number; y: number } | null>(null);

  // Source defaults to "bonti" so persisted meetings written before this
  // field existed still surface a sensible label after a reload.
  const meetingSource = groupMeeting?.source ?? "bonti";
  const meetingVenueName = groupMeeting?.point_id
    ? findVenueById(groupMeeting.point_id)?.name ?? null
    : null;

  const basePins = [
    { id: maria.id, coords: maria.coords, color: "#EB0000", label: maria.name[0] },
    ...friends.map(f => ({ id: f.id, coords: f.coords, color: "#0A0A0A", label: f.name[0] })),
  ];
  const pins = groupMeeting
    ? [
        ...basePins,
        {
          id: "__meeting__",
          coords: groupMeeting.coords,
          color: meetingSource === "manual" ? "#1E40AF" : "#EB0000",
          label: "📍",
          size: 34,
        },
      ]
    : pendingManual
      ? [
          ...basePins,
          {
            id: "__pending__",
            coords: pendingManual,
            color: "#1E40AF",
            label: "📍",
            size: 34,
          },
        ]
      : basePins;

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
          {groupMeeting
            ? meetingVenueName
              ? ` · meeting at ${meetingVenueName}`
              : " · meeting at your dropped pin"
            : " · spread across the venue"}
        </p>
      </div>
      <div className="px-4 pt-4">
        <VenueMap
          pins={pins}
          highlight={groupMeeting?.point_id}
          onMapClick={
            groupMeeting
              ? undefined
              : (coords) => {
                  setPendingManual(coords);
                  setResultLine(null);
                  setError(null);
                }
          }
        />
        {!groupMeeting && (
          <p className="mt-2 text-bonti-text/70 font-roboto text-[11px]">
            {pendingManual
              ? "Pin placed. Press “Meet here” to start the meeting."
              : "Tap the map to pick a manual meeting spot."}
          </p>
        )}
      </div>

      <div className="px-4 pt-4">
        {!groupMeeting ? (
          <>
            <div className="mb-2">
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sofia uppercase tracking-wide text-[10px]",
                  pendingManual
                    ? "bg-blue-100 text-blue-800"
                    : "bg-bonti-red/10 text-bonti-red",
                ].join(" ")}
              >
                {pendingManual ? "🖐️ Manual pick" : "🤖 Bonți will choose"}
              </span>
            </div>
            {pendingManual ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualMeeting(pendingManual);
                  setPendingManual(null);
                }}
                className="flex-1 bg-bonti-red text-white font-sofia uppercase tracking-wide rounded-lg py-3"
              >
                Meet here
              </button>
              <button
                type="button"
                onClick={() => setPendingManual(null)}
                className="px-4 bg-bonti-surface border border-black/10 text-bonti-text font-sofia uppercase tracking-wide rounded-lg py-3"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={meet}
              disabled={loading}
              className="w-full bg-bonti-red text-white font-sofia uppercase tracking-wide rounded-lg py-3 disabled:opacity-50"
            >
              {loading ? "Bonți's thinking…" : "Let's meet up"}
            </button>
            )}
          </>
        ) : (
          <div className="bg-bonti-surface border border-black/5 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sofia uppercase tracking-wide text-[10px]",
                  meetingSource === "manual"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-bonti-red/10 text-bonti-red",
                ].join(" ")}
              >
                {meetingSource === "manual" ? "🖐️ Manual pick" : "🤖 Chosen by Bonți"}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearMeeting();
                  setResultLine(null);
                }}
                className="text-[11px] font-roboto underline text-bonti-text/70"
              >
                Clear pin
              </button>
            </div>
            {meetingSource === "bonti" ? (
              <>
                <p className="text-bonti-text font-sofia uppercase text-sm mt-2">
                  ETA {groupMeeting.eta_min} min
                </p>
                <p className="text-bonti-text font-roboto text-sm mt-1">{groupMeeting.reason}</p>
                {resultLine && (
                  <p className="text-bonti-text/70 font-roboto text-xs italic mt-2">
                    Bonți pushed: &ldquo;{resultLine}&rdquo;
                  </p>
                )}
              </>
            ) : (
              <p className="text-bonti-text font-roboto text-sm mt-2">
                {meetingVenueName
                  ? `Meeting at ${meetingVenueName}.`
                  : "Meeting at the dropped pin."}
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
