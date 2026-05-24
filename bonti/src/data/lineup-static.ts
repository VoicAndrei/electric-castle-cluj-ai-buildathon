import lineupJson from "../../docs/ingest/lineup.json";

export type LineupEntry = {
  artist: string;
  day: "Thursday" | "Friday" | "Saturday" | "Sunday";
  stage: "Main Stage" | "Hangar Stage" | "Booha Stage" | string;
  /** ISO 8601 UTC. Optional so legacy entries without a schedule still parse. */
  start_at?: string | null;
  end_at?: string | null;
  ec_tags: string[];
  genres: string[];
};

export const LINEUP: LineupEntry[] = lineupJson as LineupEntry[];
