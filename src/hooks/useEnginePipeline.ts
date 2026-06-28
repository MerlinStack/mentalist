import { useEffect, useRef, useState, useCallback } from "react";
import { useSoundStore } from "../store/soundStore";

// ─────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export interface EngineProgress {
  model: "asr" | "embedder";
  status: string;
  loaded: number;
  total: number;
}

/** Payload returned by the implicit reverse-lookup pipeline */
export interface ReverseLookupResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  confidence: number;
  stage: "semantic";
}

interface DatabaseRecord {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  vector: number[] | Float32Array;
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useEnginePipeline() {
  const workerRef = useRef<Worker | null>(null);

  const [status, setStatus] = useState<EngineStatus>("idle");
  const [webgpu, setWebgpu] = useState(false);
  const [asrReady, setAsrReady] = useState(false);
  const [embedderReady, setEmbedderReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<Record<string, EngineProgress>>({});
  const [dbCount, setDbCount] = useState(0);

  // ── Worker bootstrap ──────────────────────────────────

  useEffect(() => {
    const worker = new Worker(new URL("../workers/engine.worker", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case "ready":
          // Worker JS loaded; models not yet requested
          break;

        case "progress": {
          const entry: EngineProgress = {
            model: msg.model,
            status: msg.status,
            loaded: msg.loaded,
            total: msg.total,
          };
          setProgress((p) => ({ ...p, [msg.model]: entry }));
          if (msg.model === "asr") {
            useSoundStore.getState().setWhisperProgress(msg.status, msg.loaded, msg.total);
          } else {
            useSoundStore.getState().setSemanticProgress(msg.status, msg.loaded, msg.total);
          }
          break;
        }

        case "loaded":
          setAsrReady(true);
          setEmbedderReady(true);
          setStatus("ready");
          setWebgpu(!!msg.webgpu);
          useSoundStore.getState().setWhisperModelLoaded(true);
          useSoundStore.getState().setSemanticModelLoaded(true);
          break;

        case "error":
          setStatus("error");
          console.error("Engine worker error:", msg.error);
          break;

        case "databaseLoaded":
          setDbCount(msg.count);
          break;

        case "transcript":
          setProcessing(false);
          break;

        case "results":
          setProcessing(false);
          break;
      }
    };

    return () => worker.terminate();
  }, []);

  // ── Public API ────────────────────────────────────────

  /** Load the primary WebGPU model set (bge-base-en-v1.5 + whisper-large-v3-turbo).
   *  Falls through to legacy CPU models (MiniLM + whisper-tiny) transparently. */
  const loadModels = useCallback(
    (useWebGPU = true): Promise<boolean> => {
      return new Promise((resolve) => {
        const w = workerRef.current;
        if (!w) {
          resolve(false);
          return;
        }
        if (asrReady && embedderReady) {
          resolve(true);
          return;
        }

        setStatus("loading");
        setAsrReady(false);
        setEmbedderReady(false);
        useSoundStore.getState().setWhisperModelLoaded(false);
        useSoundStore.getState().setSemanticModelLoaded(false);

        const handler = (ev: MessageEvent) => {
          if (ev.data.type === "loaded") {
            w.removeEventListener("message", handler);
            resolve(true);
          }
          if (ev.data.type === "error") {
            w.removeEventListener("message", handler);
            resolve(false);
          }
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "load", payload: { webgpu: useWebGPU } });

        setTimeout(() => {
          w.removeEventListener("message", handler);
          resolve(false);
        }, 180000);
      });
    },
    [asrReady, embedderReady],
  );

  /** Transcribe raw 16 kHz Float32 audio */
  const transcribe = useCallback(
    (audioData: Float32Array | ArrayBuffer): Promise<string> => {
      return new Promise((resolve, reject) => {
        const w = workerRef.current;
        if (!w || !asrReady) {
          reject(new Error("ASR model not loaded"));
          return;
        }

        setProcessing(true);

        const handler = (ev: MessageEvent) => {
          if (ev.data.type === "transcript") {
            w.removeEventListener("message", handler);
            if (ev.data.error) {
              reject(new Error(ev.data.error));
            } else {
              resolve(ev.data.text || "");
            }
          }
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "transcribe", payload: audioData });

        setTimeout(() => {
          w.removeEventListener("message", handler);
          setProcessing(false);
          reject(new Error("Transcription timeout"));
        }, 60000);
      });
    },
    [asrReady],
  );

  /** Compute a 768-d embedding vector for a text string */
  const embed = useCallback(
    (text: string): Promise<number[]> => {
      return new Promise((resolve, reject) => {
        const w = workerRef.current;
        if (!w || !embedderReady) {
          reject(new Error("Embedder not loaded"));
          return;
        }

        const handler = (ev: MessageEvent) => {
          if (ev.data.type === "embedding") {
            w.removeEventListener("message", handler);
            if (ev.data.error) {
              reject(new Error(ev.data.error));
            } else {
              resolve(ev.data.vector);
            }
          }
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "embed", payload: text });

        setTimeout(() => {
          w.removeEventListener("message", handler);
          reject(new Error("Embedding timeout"));
        }, 30000);
      });
    },
    [embedderReady],
  );

  /** Seed the worker with the pre-computed verse vector database */
  const loadDatabase = useCallback((records: DatabaseRecord[]) => {
    workerRef.current?.postMessage({ type: "loadDatabase", payload: records });
  }, []);

  /** Reverse-lookup: compare a text query against the loaded verse database
   *  via cosine similarity. Returns matches above threshold or empty array. */
  const searchSimilar = useCallback(
    (query: string, threshold = 0.78): Promise<ReverseLookupResult[]> => {
      return new Promise((resolve, reject) => {
        const w = workerRef.current;
        if (!w || !embedderReady) {
          reject(new Error("Embedder not loaded"));
          return;
        }

        setProcessing(true);

        const handler = (ev: MessageEvent) => {
          if (ev.data.type === "results") {
            w.removeEventListener("message", handler);
            setProcessing(false);
            if (ev.data.error) {
              reject(new Error(ev.data.error));
            } else {
              const filtered = (ev.data.matches || []).filter(
                (m: ReverseLookupResult) => m.confidence >= threshold,
              );
              resolve(filtered);
            }
          }
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "search", payload: query });

        setTimeout(() => {
          w.removeEventListener("message", handler);
          setProcessing(false);
          reject(new Error("Semantic search timeout"));
        }, 30000);
      });
    },
    [embedderReady],
  );

  return {
    // State
    status,
    webgpu,
    asrReady,
    embedderReady,
    processing,
    progress,
    dbCount,

    // Actions
    loadModels,
    transcribe,
    embed,
    loadDatabase,
    searchSimilar,
  };
}
