import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Bonti - Electric Castle Companion",
  },
});

// Primary: OpenRouter's auto-router picks any currently-available free model
// (handles per-model rate limits and provider outages transparently).
export const BONTI_LLM = openrouter("openrouter/auto");

// Fallbacks for completion-style calls where auto-router can't be used directly.
// Listed in preferred order; route swaps to next on rate-limit/provider error.
export const FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "deepseek/deepseek-v4-flash:free",
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
];

export function getOpenRouterFor(modelId: string) {
  return openrouter(modelId);
}

// Keep these exports for any code still referencing them.
export const GEMMA_4_31B = openrouter("google/gemma-4-31b-it:free");
export const DEEPSEEK_V4_FLASH = openrouter("deepseek/deepseek-v4-flash:free");
