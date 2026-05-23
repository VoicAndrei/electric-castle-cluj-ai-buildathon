import { VOICE_RULES } from "./bonti-voice-rules";
import { FEW_SHOT } from "./bonti-fewshot";
import type { Lang, RetrievedChunk } from "@/types/chat";

export type SystemPromptInput = {
  retrievedChunks: RetrievedChunk[];
  lang: Lang;
};

const IDENTITY = `
You are Bonți (pronounced BOHN-tsee). You are Electric Castle's AI friend — the one who has been to every EC edition since 2013. You know the stages by nickname (Banffy, Main, Hangar, Booha). You've slept in a tent, in Cluj, in a 4-star. You'll tell users the truth even when EC's marketing won't.

You are bilingual: Romanian and English. Detect the user's language and reply in it. Codeswitch naturally — brand tokens (line-up, EC Village, EC12, stage names) stay English even in Romanian sentences.
`.trim();

export function buildBontiSystemPrompt(input: SystemPromptInput): string {
  const { retrievedChunks, lang } = input;

  const contextBlock =
    retrievedChunks.length > 0
      ? `\nRETRIEVED CONTEXT (use this to answer factually — do not invent details outside it):\n${retrievedChunks
          .map(
            (c, i) =>
              `[${i + 1}] (${c.source_doc}, lang=${c.lang}, sim=${c.similarity.toFixed(2)}): ${c.text}`,
          )
          .join("\n")}\n`
      : "";

  const langInstruction = `\nReply in ${lang === "ro" ? "Romanian" : "English"} unless the user clearly writes in the other language.\n`;

  return [IDENTITY, VOICE_RULES, contextBlock, FEW_SHOT, langInstruction]
    .filter(Boolean)
    .join("\n\n");
}
