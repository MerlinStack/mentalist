import { pipeline } from "@huggingface/transformers";

let extractor: any = null;
let embeddings: any[] = [];

function cosineSimilarity(a: Float32Array, b: number[]): number {
  const bFloat = new Float32Array(b);
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * bFloat[i];
    normA += a[i] * a[i];
    normB += bFloat[i] * bFloat[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "load") {
    try {
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true,
        progress_callback: (progress: any) => {
          self.postMessage({
            type: "progress",
            status: progress.status,
            loaded: progress.loaded,
            total: progress.total,
          });
        },
      });
      self.postMessage({ type: "loaded" });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }

  if (type === "loadEmbeddings") {
    embeddings = payload.embeddings || payload || [];
    self.postMessage({ type: "embeddingsLoaded" });
  }

  if (type === "search") {
    if (!extractor) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }
    try {
      const queryEmbedding = await extractor(payload, { pooling: "mean", normalize: true });

      const results = embeddings.map((verse: any, index: number) => ({
        ...verse,
        score: cosineSimilarity(queryEmbedding.data, verse.vector),
        index,
      }));

      const topResults = results.sort((a: any, b: any) => b.score - a.score).slice(0, 5);
      self.postMessage({ type: "results", matches: topResults });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }
};

self.postMessage({ type: "ready" });
