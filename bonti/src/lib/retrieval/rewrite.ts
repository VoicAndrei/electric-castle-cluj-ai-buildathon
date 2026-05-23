import type { ChatMessage } from "@/types/chat";

export type RewriteInput = {
  history: ChatMessage[];
  message: string;
  generateText: (prompt: string) => Promise<string>;
};

const REWRITE_PROMPT = `
You rewrite the latest user message into a self-contained search query that can be used for retrieval without seeing the prior conversation. Resolve pronouns (it, they, that, this) and missing referents using the conversation history. Output ONLY the rewritten query — no preamble, no quotes, no explanation.

CONVERSATION HISTORY:
{{HISTORY}}

LATEST USER MESSAGE:
{{MESSAGE}}

REWRITTEN QUERY:`.trim();

export async function rewriteForRetrieval(input: RewriteInput): Promise<string> {
  const { history, message, generateText } = input;

  if (history.length === 0) return message;

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const prompt = REWRITE_PROMPT.replace("{{HISTORY}}", historyText).replace("{{MESSAGE}}", message);

  try {
    const rewritten = await generateText(prompt);
    return rewritten.trim() || message;
  } catch {
    return message;
  }
}
