import { streamText, generateText, type CoreMessage } from "ai";
import { GEMMA_4_31B } from "@/lib/openrouter";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";
import { generateHydeAnswer } from "@/lib/retrieval/hyde";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { buildBontiSystemPrompt } from "@/lib/prompts/bonti-system";
import type { ChatMessage, Lang } from "@/types/chat";

export const runtime = "nodejs"; // Transformers.js needs Node, not Edge

type Body = {
  messages: ChatMessage[];
  lang?: Lang;
};

function detectLang(text: string): Lang {
  const ro = /\b(și|sau|cu|fără|când|cum|unde|de|la|este|sunt|nu)\b|[ăâîșț]/i;
  return ro.test(text) ? "ro" : "en";
}

async function llmCompletion(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: GEMMA_4_31B,
    prompt,
    temperature: 0.3,
  });
  return text;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const messages = body.messages ?? [];
  const latest = messages[messages.length - 1];
  if (!latest || latest.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }
  const history: ChatMessage[] = messages.slice(0, -1);
  const lang: Lang = body.lang ?? detectLang(latest.content);

  const standalone = await rewriteForRetrieval({
    history,
    message: latest.content,
    generateText: llmCompletion,
  });

  const hypo = await generateHydeAnswer({
    question: standalone,
    generateText: llmCompletion,
  });

  const chunks = await hybridRetrieve(hypo, { lang, k: 5 });

  const systemPrompt = buildBontiSystemPrompt({
    retrievedChunks: chunks,
    lang,
  });

  const coreMessages: CoreMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = streamText({
    model: GEMMA_4_31B,
    system: systemPrompt,
    messages: coreMessages,
    temperature: 0.6,
  });

  return result.toTextStreamResponse();
}
