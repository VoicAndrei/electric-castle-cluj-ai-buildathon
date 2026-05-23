export type Lang = "en" | "ro";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RetrievedChunk = {
  id: number;
  source_doc: string;
  text: string;
  lang: Lang;
  tags: string[];
  similarity: number;
};
