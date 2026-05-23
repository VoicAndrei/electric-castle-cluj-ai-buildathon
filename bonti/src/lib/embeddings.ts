const COHERE_API_URL = "https://api.cohere.ai/v2/embed";

type CohereInputType = "search_document" | "search_query" | "classification" | "clustering";

type CohereResponse = {
  id: string;
  embeddings: { float: number[][] };
  meta?: { billed_units?: { input_tokens?: number } };
};

/**
 * Call Cohere's hosted embedding API.
 * - search_document → embed KB chunks at ingest time
 * - search_query    → embed user queries at chat time
 * Same model, different embedding optimized per use case (improves retrieval).
 * Returns 1024-dim Float32Arrays.
 */
async function callCohere(
  texts: string[],
  inputType: CohereInputType,
): Promise<number[][]> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("COHERE_API_KEY is not set");
  const model = process.env.COHERE_MODEL ?? "embed-multilingual-v3.0";

  const res = await fetch(COHERE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input_type: inputType,
      embedding_types: ["float"],
      texts,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cohere API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as CohereResponse;
  return json.embeddings.float;
}

/**
 * Embed a single user query. Uses search_query input_type for retrieval.
 */
export async function embed(text: string): Promise<Float32Array> {
  const [vec] = await callCohere([text], "search_query");
  return new Float32Array(vec);
}

/**
 * Embed many KB documents at ingest time. Uses search_document input_type.
 * Cohere supports up to 96 texts per call; we batch in groups of 90 to be safe.
 */
export async function embedMany(texts: string[]): Promise<Float32Array[]> {
  const BATCH = 90;
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const vectors = await callCohere(batch, "search_document");
    for (const v of vectors) out.push(new Float32Array(v));
  }
  return out;
}
