"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { LineupRow } from "@/components/lineup-row";
import { ArtistSheet } from "@/components/artist-sheet";
import { useLineupRealtime, type LineupRow as Row } from "@/hooks/use-lineup-realtime";
import { useEventLogger } from "@/hooks/use-event-logger";
import { createClient } from "@/lib/supabase/client";

const DAYS: Row["day"][] = ["Thursday", "Friday", "Saturday", "Sunday"];

type MatchOutput = {
  picks: { artist: string }[];
  skips: { artist: string }[];
};

export function LineupClient({ initial }: { initial: Row[] }) {
  const { rows, flashIds } = useLineupRealtime(initial);
  const [day, setDay] = useState<Row["day"]>("Saturday");
  const [match, setMatch] = useState<MatchOutput | null>(null);
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const log = useEventLogger();

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

  useEffect(() => {
    log("lineup_view", { day, language: "en", has_match: !!match });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const overlayFor = (r: Row): "pick" | "skip" | null => {
    if (!match) return null;
    if (match.picks?.some(p => p.artist.toLowerCase() === r.artist_name.toLowerCase())) return "pick";
    if (match.skips?.some(s => s.artist.toLowerCase() === r.artist_name.toLowerCase())) return "skip";
    return null;
  };

  const filtered = useMemo(() => rows.filter(r => r.day === day), [rows, day]);

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
            Paste a Spotify playlist link in the Bonți chat to color these rows green/red.
          </p>
        </div>
      )}

      <div>
        {filtered.map(r => (
          <LineupRow
            key={r.id}
            row={r}
            overlay={overlayFor(r)}
            flashing={flashIds.has(r.id)}
            onClick={() => setOpenRow(r)}
          />
        ))}
      </div>

      <ArtistSheet entry={openRow ? { artist: openRow.artist_name, day: openRow.day, stage: openRow.stage, ec_tags: openRow.ec_tags, genres: openRow.genres } : null} onClose={() => setOpenRow(null)} />
    </>
  );
}
