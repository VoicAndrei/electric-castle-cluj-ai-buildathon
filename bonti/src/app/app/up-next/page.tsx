"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/client";

type UpNextPick = {
  artist: string;
  stage: string;
  when: string;
  reason: string;
};

type UpNextResponse = {
  intro: string;
  picks: UpNextPick[];
};

type StoredMatch = {
  picks?: Array<{ artist: string }>;
};

// Saturday 21:43 — the DEMO_NOW anchor from festival-state.ts. Hard-coded
// because the demo runs in a fixed in-festival moment; in production this
// would come from the device clock.
const DEMO_DAY = "Saturday";
const DEMO_TIME = "21:43";

export default function UpNextPage() {
  const [result, setResult] = useState<UpNextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTaste, setHasTaste] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sb = createClient();
      const { data: matchRow } = await sb
        .from("music_matches")
        .select("output")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const stored = matchRow?.output as StoredMatch | null;
      const tastePicks = stored?.picks?.map((p) => p.artist).slice(0, 12) ?? [];
      if (!cancelled) setHasTaste(tastePicks.length > 0);

      const res = await fetch("/api/up-next", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day: DEMO_DAY,
          current_time: DEMO_TIME,
          match_picks: tastePicks,
        }),
      });

      if (cancelled) return;
      if (!res.ok) {
        setError(`Up-next unavailable (HTTP ${res.status})`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as UpNextResponse;
      setResult(json);
      setLoading(false);
    }

    void load().catch((e: unknown) => {
      if (cancelled) return;
      setError((e as Error).message);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AppHeader title="Up Next" showBack />
      <div className="px-4 pt-4">
        <p className="text-bonti-text/70 text-xs font-roboto uppercase tracking-wide">
          {DEMO_DAY} · {DEMO_TIME}
        </p>
        {hasTaste ? (
          <p className="text-bonti-text/60 text-[11px] font-roboto mt-1">
            Tuned to your Spotify match.
          </p>
        ) : (
          <p className="text-bonti-text/60 text-[11px] font-roboto mt-1">
            Paste a Spotify playlist link in the Bonți chat to tune these picks to your taste.
          </p>
        )}
      </div>

      {loading && (
        <p className="mx-4 mt-6 text-bonti-text/60 font-roboto text-sm">Bonți&apos;s reading the room…</p>
      )}

      {error && (
        <div className="mx-4 mt-6 bg-bonti-surface border border-bonti-red/50 rounded-xl p-4">
          <p className="text-bonti-red text-sm font-roboto">{error}</p>
        </div>
      )}

      {result && (
        <>
          <div className="mx-4 mt-4 bg-bonti-surface border border-black/5 rounded-xl p-4">
            <p className="text-bonti-text font-roboto text-sm leading-snug">{result.intro}</p>
          </div>
          <div className="mx-4 mt-3 flex flex-col gap-3">
            {result.picks.map((p, i) => (
              <article
                key={`${p.artist}-${i}`}
                className="bg-bonti-surface border border-black/5 rounded-xl p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-bonti-text font-sofia uppercase text-base tracking-wide truncate">
                    {p.artist}
                  </h3>
                  <span className="text-bonti-red text-[10px] font-sofia uppercase tracking-wider shrink-0">
                    {p.when}
                  </span>
                </div>
                <p className="text-bonti-text/60 text-xs font-roboto mt-0.5">{p.stage}</p>
                <p className="text-bonti-text font-roboto text-sm mt-2 leading-snug">{p.reason}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
