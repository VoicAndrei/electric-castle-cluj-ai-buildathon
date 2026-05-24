"use client";

import { useEffect, useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import { DEMO_NOW } from "@/data/festival-state";
import { LINEUP } from "@/data/lineup-static";
import { createClient } from "@/lib/supabase/client";

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type NextPick = { artist: string; stage: string; day: string };

export function FestivalHero() {
  const [nextPick, setNextPick] = useState<NextPick | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.from("music_matches")
      .select("output, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.output && Array.isArray(data.output.picks) && data.output.picks.length > 0) {
          const first = data.output.picks[0];
          const lineupRow = LINEUP.find(l => l.artist.toLowerCase() === String(first.artist).toLowerCase());
          if (lineupRow) {
            setNextPick({ artist: lineupRow.artist, stage: lineupRow.stage, day: lineupRow.day });
          }
        }
        setLoaded(true);
      });
  }, []);

  return (
    <section className="bg-bonti-surface rounded-xl p-4 mx-4 mt-4 border border-black/5">
      <div className="flex items-center gap-3">
        <BontiAvatar size="md" animated />
        <div className="flex-1 min-w-0">
          <p className="text-bonti-text/60 text-xs font-roboto">{formatClock(DEMO_NOW)} · Saturday</p>
          {loaded && nextPick ? (
            <p className="text-bonti-text font-sofia uppercase text-base leading-tight mt-0.5 truncate">
              {nextPick.artist} · {nextPick.stage}
            </p>
          ) : (
            <p className="text-bonti-text font-roboto text-sm mt-0.5">
              Tell me what you want and I&apos;ll point you there.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
