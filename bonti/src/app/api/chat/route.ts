import { generateText, type ModelMessage } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import {
  buildBontiSystemPrompt,
  buildBontiInFestivalSystemPrompt,
} from "@/lib/prompts/bonti-system";
import type { ChatMessage, Lang, Mode } from "@/types/chat";

export const runtime = "nodejs";

type Body = {
  messages: ChatMessage[];
  lang?: Lang;
  mode?: Mode;
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
  const mode: Mode = body.mode ?? "pre_ticket";

  // Adaptive pipeline: only rewrite when there's chat history to disambiguate.
  // HyDE is overkill for our small KB; embed the rewritten/raw query directly.
  const queryForRetrieval =
    history.length > 0
      ? await rewriteForRetrieval({
          history,
          message: latest.content,
          generateText: llmCompletion,
        })
      : latest.content;

  const chunks = await hybridRetrieve(queryForRetrieval, { lang, k: 5 });

  const systemPrompt =
    mode === "in_festival"
      ? buildBontiInFestivalSystemPrompt({ retrievedChunks: chunks, lang })
      : buildBontiSystemPrompt({ retrievedChunks: chunks, lang });

  const coreMessages: ModelMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Buffer the reply server-side so we can validate non-empty and walk the
  // fallback chain when a free model returns nothing (the empty-bubble bug).
  // We give up token-by-token streaming for guaranteed-non-empty replies.
  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.3,
        maxRetries: 0,
      });
      const reply = text?.trim();
      if (reply) {
        return new Response(reply, {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
      lastErr = new Error(`Empty reply from ${label}`);
      console.warn(`[chat] ${label} returned empty, walking fallback`);
    } catch (e) {
      lastErr = e;
      console.warn(`[chat] ${label} threw, walking fallback:`, (e as Error).message);
    }
  }
  return new Response(
    `All free models unavailable: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    { status: 503 },
  );
}
