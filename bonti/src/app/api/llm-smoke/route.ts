import { streamText } from "ai";
import { GEMMA_4_31B } from "@/lib/openrouter";

export async function GET() {
  const result = streamText({
    model: GEMMA_4_31B,
    prompt: "Say 'Bonti is online' in exactly three words. No punctuation.",
  });
  return result.toTextStreamResponse();
}
