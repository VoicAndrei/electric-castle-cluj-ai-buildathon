import { streamText, generateText, type CoreMessage } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";
import { generateHydeAnswer } from "@/lib/retrieval/hyde";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { buildBontiSystemPrompt } from "@/lib/prompts/bonti-system";
import type { ChatMessage, Lang } from "@/types/chat";

export const runtime = "nodejs";

type Body = {
  messages: ChatMessage[];
  lang?: Lang;
};

function detectLang(text: string): Lang {
  const ro = /\b(și|sau|cu|fără|când|cum|unde|de|la|este|sunt|nu)\b|[ăâîșț]/i;
  return ro.test(text) ? "ro" : "en";
}

/**
 * Tries the auto-router first, then walks the fallback list on rate-limit
 * or provider errors. Returns plain text (for rewrite/HyDE calls).
 */
async function llmCompletion(prompt: string): Promise<string> {
  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { text } = await generateText({ model, prompt, temperature: 0.3 });
      if (text && text.trim()) return text;
      lastErr = new Error(`Empty response from ${label}`);
    } catch (e) {
      lastErr = e;
      // Continue to next candidate on rate-limit/quota/provider errors.
    }
  }
  throw lastErr ?? new Error("All LLM candidates failed");
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

  // For the final streamed reply, try the auto-router first and fall back on error.
  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const result = streamText({
        model,
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.6,
        onError: (e) => {
          // Streaming errors surface here; the loop's catch handles non-streaming errors.
          console.error(`[chat] stream error from ${label}:`, e);
        },
      });
      return result.toTextStreamResponse();
    } catch (e) {
      lastErr = e;
      console.error(`[chat] failed with ${label}:`, e);
    }
  }
  return new Response(
    `All free models unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
