import { createOpenAI } from "@ai-sdk/openai";

// Primary: OpenAI direct (gpt-5.4-mini). Reliable, fast, supports Responses API
// natively — fixes the "Invalid Responses API request" 503 that bit multi-turn
// chat when OpenRouter's auto-router picked a model whose backend couldn't
// honor the Responses-API call shape the AI SDK emits.
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const BONTI_LLM = openai("gpt-5.4-mini");

// Cold fallback: free OpenRouter models. Walked only when the primary throws
// (rate limit, key revoked mid-demo, OpenAI outage). Keeps the demo from ever
// returning 503, even if degraded.
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Bonti - Electric Castle Companion",
  },
});

export const FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "deepseek/deepseek-v4-flash:free",
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
];

export function getOpenRouterFor(modelId: string) {
  return openrouter(modelId);
}

// Legacy named exports — kept for any direct importers.
export const GEMMA_4_31B = openrouter("google/gemma-4-31b-it:free");
export const DEEPSEEK_V4_FLASH = openrouter("deepseek/deepseek-v4-flash:free");
