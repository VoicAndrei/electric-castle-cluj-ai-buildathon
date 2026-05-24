"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CompassCard } from "@/components/compass-card";
import { CompassRouteMap } from "@/components/compass-route-map";
import { VenueMap } from "@/components/venue-map";
import { useFestivalStore } from "@/lib/festival/store";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { findVenueById } from "@/lib/festival/compass";
import type { VenuePoint } from "@/data/venue";

const CHIPS = [
  { label: "🍺 Beer",     query: "where is the closest beer" },
  { label: "🚻 Bathroom", query: "where is the closest bathroom with a short line" },
  { label: "🍕 Food",     query: "where can I get food quickly" },
  { label: "🌿 Quiet",    query: "I want somewhere quiet for 15 minutes" },
];

type CompassResult = {
  target: VenuePoint;
  reason: string;
  line_state: string;
  bontiLine: string;
};

function resolveDeepLink(targetId: string | null): CompassResult | null {
  if (!targetId) return null;
  const target = findVenueById(targetId);
  if (!target) return null;
  return {
    target,
    reason: "Linked from a notification.",
    line_state: target.lineProbability === "high" ? "Heavy line" :
                target.lineProbability === "med"  ? "Some line"  : "Short line",
    bontiLine: target.bonti_blurb ?? `${target.name}.`,
  };
}

function CompassInner() {
  const params = useSearchParams();
  const maria = useFestivalStore(s => s.maria);
  const { heading } = useDeviceHeading();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep-link from a ping: /app/compass?target=main_stage → resolve directly.
  // Use the "Adjusting state on prop change" pattern from the React docs:
  // compare last-seen URL targetId against current; if changed, setState during
  // render of *this* component (legal per React; avoids cascading effect renders).
  const targetId = params.get("target");
  const [lastTargetId, setLastTargetId] = useState<string | null>(targetId);
  const [result, setResult] = useState<CompassResult | null>(() => resolveDeepLink(targetId));
  if (targetId !== lastTargetId) {
    setLastTargetId(targetId);
    const linked = resolveDeepLink(targetId);
    if (linked) setResult(linked);
  }

  const send = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, lang: "en" }),
      });
      if (!res.ok) throw new Error(`Compass unavailable (${res.status})`);
      const body = await res.json();
      const target = findVenueById(body.target_id);
      if (!target) throw new Error(`Unknown venue: ${body.target_id}`);
      setResult({
        target,
        reason: body.reason,
        line_state: body.line_state,
        bontiLine: `${target.name}, ${body.line_state.toLowerCase()}`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader title="Compass" showBack />
      <div className="px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(query); }}
          placeholder="Where to?"
          className="w-full bg-bonti-surface border border-black/10 rounded-lg px-4 py-3 font-roboto text-base outline-none focus:border-bonti-red"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => { setQuery(c.query); send(c.query); }}
              disabled={loading}
              className="bg-bonti-surface border border-black/10 rounded-full px-3 py-1.5 text-xs font-roboto"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mx-4 mt-6 text-bonti-text/60 text-sm font-roboto">Bonți&apos;s thinking…</p>
      )}
      {error && (
        <div className="mx-4 mt-6 bg-bonti-surface border border-bonti-red/50 rounded-xl p-4">
          <p className="text-bonti-red text-sm font-roboto">{error}</p>
          <button
            onClick={() => send(query)}
            className="mt-2 text-xs font-roboto underline text-bonti-text"
          >Try again</button>
        </div>
      )}
      {result && (
        <CompassCard
          target={result.target}
          from={maria.coords}
          reason={result.reason}
          line_state={result.line_state}
          bontiLine={result.bontiLine}
        />
      )}
      {result ? (
        <CompassRouteMap
          target={result.target}
          from={maria.coords}
          heading={heading}
        />
      ) : (
        <div className="mx-4 mt-4">
          <VenueMap
            pins={[
              { id: maria.id, coords: maria.coords, color: "#EB0000", label: maria.name[0] },
            ]}
          />
        </div>
      )}
    </>
  );
}

export default function CompassPage() {
  return (
    <Suspense fallback={null}>
      <CompassInner />
    </Suspense>
  );
}
