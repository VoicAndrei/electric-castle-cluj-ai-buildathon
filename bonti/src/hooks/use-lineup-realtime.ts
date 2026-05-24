"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LineupRow = {
  id: string;
  artist_name: string;
  day: "Thursday" | "Friday" | "Saturday" | "Sunday";
  stage: string;
  start_at: string | null;
  end_at: string | null;
  ec_tags: string[];
  genres: string[];
  photo_url: string | null;
  sort_order: number;
};

type Change = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  new: LineupRow;
  old: { id: string };
};

const DAY_ORDER: Record<LineupRow["day"], number> = { Thursday: 0, Friday: 1, Saturday: 2, Sunday: 3 };

export function byDayThenSort(a: LineupRow, b: LineupRow): number {
  return (
    DAY_ORDER[a.day] - DAY_ORDER[b.day]
    || a.sort_order - b.sort_order
    || a.artist_name.localeCompare(b.artist_name)
  );
}

export function applyChange(prev: LineupRow[], payload: Change): LineupRow[] {
  switch (payload.eventType) {
    case "INSERT":
      return [...prev, payload.new].sort(byDayThenSort);
    case "UPDATE":
      return prev.map(r => (r.id === payload.new.id ? payload.new : r)).sort(byDayThenSort);
    case "DELETE":
      return prev.filter(r => r.id !== payload.old.id);
    default:
      return prev;
  }
}

export function useLineupRealtime(initial: LineupRow[]): { rows: LineupRow[]; flashIds: Set<string> } {
  const [rows, setRows] = useState<LineupRow[]>(initial);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("bonti-lineup")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "lineup_entries" } as never,
        (payload: Change) => {
          setRows(prev => applyChange(prev, payload));
          const id = payload.new?.id ?? payload.old?.id;
          if (id) {
            setFlashIds(prev => new Set(prev).add(id));
            setTimeout(() => {
              setFlashIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }, 1200);
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  return { rows, flashIds };
}
