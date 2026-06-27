const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let pipeline = null;

export async function loadEmbeddingModel() {
  if (pipeline) return pipeline;
  const { pipeline: pipe } = await import("@huggingface/transformers");
  pipeline = await pipe("feature-extraction", MODEL_ID, {
    quantized: true,
  });
  return pipeline;
}

export async function generateEmbedding(text) {
  const model = await loadEmbeddingModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function generateEmbeddingsBatch(texts) {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}
