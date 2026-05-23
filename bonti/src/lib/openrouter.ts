import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Bonti - Electric Castle Companion",
  },
});

export const GEMMA_4_31B = openrouter("google/gemma-4-31b-it:free");
export const DEEPSEEK_V4_FLASH = openrouter("deepseek/deepseek-v4-flash:free");
