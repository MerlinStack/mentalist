import { useEffect, useRef, useState, useCallback } from "react";
import { useSoundStore } from "../store/soundStore";

export function useTranscription() {
  const [transcript, setTranscript] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../workers/whisper.worker", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event) => {
      const { type, result, text, error, status, loaded, total } = event.data;

      if (type === "progress") {
        useSoundStore.getState().setWhisperProgress(status, loaded, total);
      }

      if (type === "loaded") {
        isLoadedRef.current = true;
        useSoundStore.getState().setWhisperModelLoaded(true);
      }

      if (type === "transcript" || type === "result") {
        const t = text || result?.text || "";
        setTranscript(t);
        useSoundStore.getState().appendTranscript(t);
      }

      if (type === "error") {
        console.error("Whisper worker error:", error);
        useSoundStore.getState().setWhisperModelLoaded(false);
      }
    };

    workerRef.current.postMessage({ type: "load" });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const transcribe = useCallback((audioData: Float32Array | ArrayBuffer): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isLoadedRef.current) {
        reject(new Error("Whisper model not loaded"));
        return;
      }

      const handler = (event: MessageEvent) => {
        const { type: msgType, result: msgResult, error: msgError } = event.data;
        if (msgType === "result") {
          workerRef.current?.removeEventListener("message", handler);
          resolve(msgResult?.text || "");
        }
        if (msgType === "error") {
          workerRef.current?.removeEventListener("message", handler);
          reject(new Error(msgError));
        }
      };

      workerRef.current.addEventListener("message", handler);
      workerRef.current.postMessage({ type: "transcribe_raw", payload: audioData });

      setTimeout(() => {
        workerRef.current?.removeEventListener("message", handler);
        reject(new Error("Transcription timeout"));
      }, 30000);
    });
  }, []);

  const loadModel = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isLoadedRef.current) {
        resolve(true);
        return;
      }
      if (!workerRef.current) {
        resolve(false);
        return;
      }
      const handler = (event: MessageEvent) => {
        const { type: msgType, error: msgError } = event.data;
        if (msgType === "loaded") {
          workerRef.current?.removeEventListener("message", handler);
          resolve(true);
        }
        if (msgType === "error") {
          workerRef.current?.removeEventListener("message", handler);
          resolve(false);
        }
      };
      workerRef.current.addEventListener("message", handler);
      workerRef.current.postMessage({ type: "load" });
      setTimeout(() => {
        workerRef.current?.removeEventListener("message", handler);
        resolve(false);
      }, 60000);
    });
  }, []);

  return {
    transcribe,
    transcript,
    loadModel,
    isModelLoaded: isLoadedRef.current,
  };
}
