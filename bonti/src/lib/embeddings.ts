import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

// Cache the model — locally use node_modules, on Vercel use /tmp
env.cacheDir = process.env.HF_CACHE_DIR ?? "./.transformers-cache";
env.allowLocalModels = false; // always fetch from HF for portability

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/bge-m3", {
      quantized: true,
    }) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

export async function embed(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return new Float32Array(output.data as Float32Array);
}

export async function embedMany(texts: string[]): Promise<Float32Array[]> {
  const results: Float32Array[] = [];
  for (const t of texts) {
    results.push(await embed(t));
  }
  return results;
}
