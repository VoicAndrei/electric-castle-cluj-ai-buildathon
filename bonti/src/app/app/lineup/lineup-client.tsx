"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { LineupRow } from "@/components/lineup-row";
import { ArtistSheet } from "@/components/artist-sheet";
import { useLineupRealtime, type LineupRow as Row } from "@/hooks/use-lineup-realtime";
import { useEventLogger } from "@/hooks/use-event-logger";
import { createClient } from "@/lib/supabase/client";
import type { MatchOutput } from "@/lib/music-match/match-schema";

const DAYS: Row["day"][] = ["Thursday", "Friday", "Saturday", "Sunday"];

// The stored music_matches row carries the LLM `output` (intro/picks/skips)
// and the `input` (the listener's normalized playlist). We hand both to
// ArtistSheet so the artist-tap blurb can personalize against the actual
// top artists from the listener's library.
type StoredMatch = MatchOutput & {
  input?: { artists?: { name: string; frequency?: number }[] };
};

export function LineupClient({ initial }: { initial: Row[] }) {
  const { rows, flashIds } = useLineupRealtime(initial);
  const [day, setDay] = useState<Row["day"]>("Saturday");
  const [match, setMatch] = useState<StoredMatch | null>(null);
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [artistQuery, setArtistQuery] = useState("");
  const [matchesOnly, setMatchesOnly] = useState(false);
  const log = useEventLogger();

  useEffect(() => {
    const sb = createClient();
    sb.from("music_matches")
      .select("output, input, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.output) {
          setMatch({ ...(data.output as MatchOutput), input: data.input ?? undefined });
        }
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

  // Stage list is derived from the current day's rows so the picker only ever
  // offers stages that actually have acts that day.
  const stagesForDay = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.day === day) set.add(r.stage);
    return Array.from(set).sort();
  }, [rows, day]);

  // Reset the stage filter when switching days if the previously selected
  // stage doesn't exist on the new day — avoids an empty list with no hint.
  useEffect(() => {
    if (stageFilter !== "all" && !stagesForDay.includes(stageFilter)) {
      setStageFilter("all");
    }
  }, [stageFilter, stagesForDay]);

  const trimmedArtist = artistQuery.trim().toLowerCase();
  // matchesOnly is only meaningful when a Bonți match exists. If the user
  // toggled it on, then ran /match again returning an empty picks array,
  // the toggle would silently hide everything — force-disable in that case.
  const pickSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of match?.picks ?? []) s.add(p.artist.toLowerCase());
    return s;
  }, [match]);
  const matchesOnlyEffective = matchesOnly && pickSet.size > 0;
  const filtersActive =
    stageFilter !== "all" || trimmedArtist.length > 0 || matchesOnlyEffective;

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (r.day !== day) return false;
      if (stageFilter !== "all" && r.stage !== stageFilter) return false;
      if (trimmedArtist && !r.artist_name.toLowerCase().includes(trimmedArtist)) return false;
      if (matchesOnlyEffective && !pickSet.has(r.artist_name.toLowerCase())) return false;
      return true;
    });
  }, [rows, day, stageFilter, trimmedArtist, matchesOnlyEffective, pickSet]);

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
        <div className="px-4 pt-2 pb-3 flex items-center gap-2">
          <input
            type="search"
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder="Filter artist…"
            aria-label="Filter by artist name"
            className="flex-1 min-w-0 bg-bonti-surface border border-black/10 rounded-lg px-3 py-2 font-roboto text-sm outline-none focus:border-bonti-red"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            aria-label="Filter by stage"
            className="bg-bonti-surface border border-black/10 rounded-lg px-2 py-2 font-roboto text-sm outline-none focus:border-bonti-red"
          >
            <option value="all">All stages</option>
            {stagesForDay.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setStageFilter("all");
                setArtistQuery("");
                setMatchesOnly(false);
              }}
              className="text-xs font-roboto underline text-bonti-text/70 whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        {match && pickSet.size > 0 && (
          <div className="px-4 pb-3 -mt-1 flex">
            <button
              type="button"
              onClick={() => setMatchesOnly(v => !v)}
              aria-pressed={matchesOnlyEffective}
              className={[
                "rounded-full px-3 py-1 font-sofia uppercase tracking-wide text-[11px] border",
                matchesOnlyEffective
                  ? "bg-green-100 border-green-300 text-green-800"
                  : "bg-bonti-surface border-black/10 text-bonti-text",
              ].join(" ")}
            >
              🟢 Matches only {matchesOnlyEffective ? "· on" : ""}
            </button>
          </div>
        )}
      </div>

      {!match && !filtersActive && (
        <div className="mx-4 mt-4 bg-bonti-surface border border-black/5 rounded-xl p-3">
          <p className="font-roboto text-sm text-bonti-text">
            Paste a Spotify playlist link in the Bonți chat to color these rows green/red.
          </p>
        </div>
      )}

      <div>
        {filtersActive && filtered.length === 0 && (
          <p className="mx-4 mt-6 text-bonti-text/60 text-sm font-roboto">
            No acts match those filters.
          </p>
        )}
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

      <ArtistSheet
        entry={openRow ? { artist: openRow.artist_name, day: openRow.day, stage: openRow.stage, ec_tags: openRow.ec_tags, genres: openRow.genres } : null}
        match={match}
        onClose={() => setOpenRow(null)}
      />
    </>
  );
}
