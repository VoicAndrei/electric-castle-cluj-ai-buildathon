const HYDE_PROMPT = `
Write 2 short sentences that a knowledgeable festival friend might say in answer to the user's question. The user is a first-time visitor at Electric Castle in Bonțida, Romania. Output ONLY the answer — no preamble.

USER QUESTION:
{{Q}}

ANSWER:`.trim();

export type HydeInput = {
  question: string;
  generateText: (prompt: string) => Promise<string>;
};

export async function generateHydeAnswer(input: HydeInput): Promise<string> {
  const { question, generateText } = input;
  try {
    const answer = await generateText(HYDE_PROMPT.replace("{{Q}}", question));
    return answer.trim() || question;
  } catch {
    return question;
  }
}
