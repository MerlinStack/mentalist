import { pipeline } from "@huggingface/transformers";

/** Lifecycle state broadcast to the main thread */
type WorkerStatus = "idle" | "loading" | "ready" | "error";

let asr: any = null;
let embedder: any = null;
let status: WorkerStatus = "idle";

/** Loaded verse-vector database for cosine-similarity reverse lookup */
let db: Array<{
  book: string;
  chapter: number;
  verse: number;
  text: string;
  vector: number[] | Float32Array;
}> = [];

function cosineSimilarity(a: Float32Array, b: number[] | Float32Array): number {
  const bArr = b instanceof Float32Array ? b : new Float32Array(b);
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * bArr[i];
    normA += a[i] * a[i];
    normB += bArr[i] * bArr[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Attempt WebGPU pipeline; fall back to CPU/WASM on failure */
async function loadASR(useWebGPU: boolean): Promise<any> {
  const model = "Xenova/whisper-large-v3-turbo";
  const opts: any = {
    quantized: true,
    progress_callback: (p: any) =>
      self.postMessage({
        type: "progress",
        model: "asr",
        status: p.status,
        loaded: p.loaded,
        total: p.total,
      }),
  };

  if (useWebGPU) {
    opts.device = "webgpu";
    opts.dtype = "fp16";
  }

  try {
    return await pipeline("automatic-speech-recognition", model, opts);
  } catch (err) {
    if (useWebGPU) {
      self.postMessage({
        type: "progress",
        model: "asr",
        status: "webgpu-fallback",
        loaded: 0,
        total: 0,
      });
      delete opts.device;
      delete opts.dtype;
      return await pipeline("automatic-speech-recognition", model, opts);
    }
    throw err;
  }
}

/** Attempt WebGPU embedder; fall back to CPU/WASM on failure */
async function loadEmbedder(useWebGPU: boolean): Promise<any> {
  const model = "Xenova/bge-base-en-v1.5";
  const opts: any = {
    quantized: true,
    progress_callback: (p: any) =>
      self.postMessage({
        type: "progress",
        model: "embedder",
        status: p.status,
        loaded: p.loaded,
        total: p.total,
      }),
  };

  if (useWebGPU) {
    opts.device = "webgpu";
  }

  try {
    return await pipeline("feature-extraction", model, opts);
  } catch (err) {
    if (useWebGPU) {
      self.postMessage({
        type: "progress",
        model: "embedder",
        status: "webgpu-fallback",
        loaded: 0,
        total: 0,
      });
      delete opts.device;
      return await pipeline("feature-extraction", model, opts);
    }
    throw err;
  }
}

/** Load the legacy low-power model set (CPU-only, quantized, tiny) */
async function loadLegacyModels(): Promise<void> {
  self.postMessage({ type: "progress", model: "asr", status: "download", loaded: 0, total: 0 });
  asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
    progress_callback: (p: any) =>
      self.postMessage({
        type: "progress",
        model: "asr",
        status: p.status,
        loaded: p.loaded,
        total: p.total,
      }),
  });

  self.postMessage({
    type: "progress",
    model: "embedder",
    status: "download",
    loaded: 0,
    total: 0,
  });
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    progress_callback: (p: any) =>
      self.postMessage({
        type: "progress",
        model: "embedder",
        status: p.status,
        loaded: p.loaded,
        total: p.total,
      }),
  });
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "load") {
    status = "loading";
    asr = null;
    embedder = null;

    try {
      const useWebGPU = payload?.webgpu !== false;

      if (useWebGPU) {
        // Attempt high-fidelity tier (WebGPU)
        asr = await loadASR(true);
        embedder = await loadEmbedder(true);
      } else {
        // Explicit CPU request — load legacy models
        await loadLegacyModels();
      }
    } catch {
      // WebGPU or bge/whipser-large failed — fall back to legacy CPU models
      self.postMessage({ type: "progress", model: "asr", status: "fallback", loaded: 0, total: 0 });
      self.postMessage({
        type: "progress",
        model: "embedder",
        status: "fallback",
        loaded: 0,
        total: 0,
      });
      try {
        await loadLegacyModels();
      } catch (err) {
        status = "error";
        self.postMessage({ type: "error", error: `All model tiers failed: ${String(err)}` });
        return;
      }
    }

    status = "ready";
    self.postMessage({
      type: "loaded",
      webgpu: asr?.options?.device === "webgpu" || embedder?.options?.device === "webgpu",
    });
    return;
  }

  if (type === "transcribe") {
    if (!asr) {
      self.postMessage({ type: "transcript", error: "ASR not loaded" });
      return;
    }
    try {
      const result = await asr(payload, { chunk_length_s: 30, stride_length_s: 5 });
      self.postMessage({ type: "transcript", text: result.text });
    } catch (err) {
      self.postMessage({ type: "transcript", error: String(err) });
    }
    return;
  }

  if (type === "embed") {
    if (!embedder) {
      self.postMessage({ type: "embedding", error: "Embedder not loaded" });
      return;
    }
    try {
      const output = await embedder(payload, { pooling: "mean", normalize: true });
      self.postMessage({ type: "embedding", vector: Array.from(output.data) });
    } catch (err) {
      self.postMessage({ type: "embedding", error: String(err) });
    }
    return;
  }

  if (type === "loadDatabase") {
    db = (payload || []).map((v: any) => ({
      ...v,
      vector: v.vector || v.embedding,
    }));
    self.postMessage({ type: "databaseLoaded", count: db.length });
    return;
  }

  if (type === "search") {
    if (!embedder) {
      self.postMessage({ type: "results", error: "Embedder not loaded" });
      return;
    }
    if (db.length === 0) {
      self.postMessage({ type: "results", error: "Database empty" });
      return;
    }
    try {
      const query = await embedder(payload, { pooling: "mean", normalize: true });
      const results = db.map((v, i) => ({
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        confidence: cosineSimilarity(query.data, v.vector),
        stage: "semantic" as const,
        index: i,
      }));
      results.sort((a, b) => b.confidence - a.confidence);
      self.postMessage({ type: "results", matches: results.slice(0, 5) });
    } catch (err) {
      self.postMessage({ type: "results", error: String(err) });
    }
    return;
  }
};

self.postMessage({ type: "ready" });
