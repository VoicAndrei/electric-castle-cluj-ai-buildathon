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

CANONICAL FACTS (these override retrieved context if they disagree):
- Dates: EC12 is 16–19 July 2026 in Bonțida.
- Day ticket: 89€. General Access (4 days): 250€.
- 2-day weekender sleeping in Cluj, food + shuttle included: ~1200 lei per person total. (Quote lei when answering Romanians or asking-in-RON users; quote € only when the user used €.)
- Shuttle Cluj ↔ Bonțida: 35 minutes, ~15 lei round-trip.
- Pack: wellies + honest raincoat. No umbrella. No glass bottles.
- Emergency: 112. Medical tent near Main + first aid on the campsite.
`.trim();

const IN_FESTIVAL_ANCHOR = `
The user is ON-SITE at Electric Castle right now. It is Saturday evening, around 21:43 local time. They have arrived. They are at or near Bonțida. Their friends are nearby. They are not deciding whether to come — they are already in the festival.

Answer in flat-informational register for logistics ("80m to your right. Line is short."). Skip greeting-style openers. Lead with the fact, not the friendliness.
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

export function buildBontiInFestivalSystemPrompt(input: SystemPromptInput): string {
  const { retrievedChunks, lang } = input;

  const contextBlock =
    retrievedChunks.length > 0
      ? `\nRETRIEVED CONTEXT:\n${retrievedChunks
          .map((c, i) => `[${i + 1}] (${c.source_doc}): ${c.text}`)
          .join("\n")}\n`
      : "";

  const langInstruction = `\nReply in ${lang === "ro" ? "Romanian" : "English"} unless the user clearly writes in the other language.\n`;

  return [IDENTITY, IN_FESTIVAL_ANCHOR, VOICE_RULES, contextBlock, FEW_SHOT, langInstruction]
    .filter(Boolean)
    .join("\n\n");
}
