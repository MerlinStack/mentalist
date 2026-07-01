import type { pipeline } from "@huggingface/transformers";

export interface EmbeddingRecord {
  book: string;
  chapter: number;
  verse: number;
  vector: number[];
}

export type EmbeddingProgressCallback = (status: string, loaded: number, total: number) => void;

export class EmbeddingEngine {
  private extractor: any = null;
  private modelId: string;

  constructor(modelId = "Xenova/all-MiniLM-L6-v2") {
    this.modelId = modelId;
  }

  async load(onProgress?: EmbeddingProgressCallback): Promise<void> {
    const { pipeline } = await import("@huggingface/transformers");
    this.extractor = await pipeline("feature-extraction", this.modelId, {
      progress_callback: (p: any) => {
        onProgress?.(p.status, p.loaded, p.total);
      },
    });
  }

  get isLoaded(): boolean {
    return this.extractor !== null;
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.extractor) throw new Error("Embedding engine not loaded");
    const output = await this.extractor(text, { pooling: "mean", normalize: true });
    return output.data as Float32Array;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.extractor) throw new Error("Embedding engine not loaded");
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  dispose(): void {
    this.extractor = null;
  }
}

export const embeddingEngine = new EmbeddingEngine();
