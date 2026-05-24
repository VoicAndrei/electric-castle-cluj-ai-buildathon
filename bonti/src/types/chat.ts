import type { MatchOutput } from "@/lib/music-match/match-schema";

export type Lang = "en" | "ro";
export type Mode = "pre_ticket" | "in_festival";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  // Inline /match result: when present on an assistant message, the
  // MessageList renders the MatchCard instead of the markdown bubble.
  // `content` still holds the card's intro line so the message is
  // serializable / readable without the card.
  match?: MatchOutput;
};

export type RetrievedChunk = {
  id: number;
  source_doc: string;
  text: string;
  lang: Lang;
  tags: string[];
  similarity: number;
};
