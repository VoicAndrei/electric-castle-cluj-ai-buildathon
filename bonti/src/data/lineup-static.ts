import lineupJson from "../../docs/ingest/lineup.json";

export type LineupEntry = {
  artist: string;
  day: "Thursday" | "Friday" | "Saturday" | "Sunday";
  stage: "Main Stage" | "Hangar Stage" | "Booha Stage" | string;
  ec_tags: string[];
  genres: string[];
};

export const LINEUP: LineupEntry[] = lineupJson as LineupEntry[];
