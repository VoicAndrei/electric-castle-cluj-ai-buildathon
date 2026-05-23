"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { LineupRow } from "@/components/lineup-row";
import { ArtistSheet } from "@/components/artist-sheet";
import { LINEUP, type LineupEntry } from "@/data/lineup";
import { createClient } from "@/lib/supabase/client";

const DAYS: LineupEntry["day"][] = ["Friday", "Saturday", "Sunday"];

type MatchOutput = {
  picks: { artist: string }[];
  skips: { artist: string }[];
};

export default function LineupPage() {
  const [day, setDay] = useState<LineupEntry["day"]>("Saturday");
  const [match, setMatch] = useState<MatchOutput | null>(null);
  const [openEntry, setOpenEntry] = useState<LineupEntry | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.from("music_matches")
      .select("output, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.output) setMatch(data.output as MatchOutput);
      });
  }, []);

  const overlayFor = (entry: LineupEntry): "pick" | "skip" | null => {
    if (!match) return null;
    if (match.picks?.some(p => p.artist.toLowerCase() === entry.artist.toLowerCase())) return "pick";
    if (match.skips?.some(s => s.artist.toLowerCase() === entry.artist.toLowerCase())) return "skip";
    return null;
  };

  const filtered = useMemo(() => LINEUP.filter(e => e.day === day), [day]);

  return (
    <>
      <AppHeader title="Lineup" showBack />
      <div className="sticky top-[52px] z-20 bg-bonti-bg border-b border-black/5">
        <div className="flex">
          {DAYS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={[
                "flex-1 py-3 font-sofia uppercase text-xs tracking-wide",
                d === day ? "text-bonti-red border-b-2 border-bonti-red" : "text-bonti-text/60",
              ].join(" ")}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {!match && (
        <div className="mx-4 mt-4 bg-bonti-surface border border-black/5 rounded-xl p-3">
          <p className="font-roboto text-sm text-bonti-text">
            Match your music to get green/red on these rows. <Link href="/match" className="text-bonti-red underline">→</Link>
          </p>
        </div>
      )}

      <div>
        {filtered.map(entry => (
          <LineupRow
            key={`${entry.artist}-${entry.day}`}
            entry={entry}
            overlay={overlayFor(entry)}
            onClick={() => setOpenEntry(entry)}
          />
        ))}
      </div>

      <ArtistSheet entry={openEntry} onClose={() => setOpenEntry(null)} />
    </>
  );
}
