import { pipeline } from "@huggingface/transformers";

let transcriber: any = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "load") {
    try {
      transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
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

  if (type === "transcribe" || type === "transcribe_raw") {
    if (!transcriber) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }
    try {
      const audioData = payload;
      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });
      self.postMessage({ type: "result", result });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }
};

self.postMessage({ type: "ready" });
