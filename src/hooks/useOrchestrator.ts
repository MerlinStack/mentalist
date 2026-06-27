import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundStore } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useProjectionStore } from "../store/projectionStore";
import { useAudioCapture } from "./useAudioCapture";
import { useTranscription } from "./useTranscription";
import { useSemanticWorker } from "./useSemanticWorker";
import { extractScriptureFromText } from "../engine/regexEngine";
import { analyzeWithContext, resetContext } from "../engine/contextEngine";
import { audioBlobToFloat32 } from "../audio/downsample";
import { fetchMultipleVerses } from "../api/bible";
import { getApiCode } from "../data/versions";
import { isCloudflareConfigured, transcribeViaCloudflare } from "../gateway/cloudflare";
import { isLovableGatewayConfigured, transcribeViaLovable } from "../gateway/lovable";

function normalise(v: any) {
  const ref = v.ref || v.reference || "";
  return { ...v, ref, reference: ref };
}

export function useOrchestrator() {
  const store = useSoundStore();
  const scripture = useScriptureStore();
  const projection = useProjectionStore();
  const channelRef = useRef<BroadcastChannel | null>(null);

  const { stream, audioLevel, startCapture, stopCapture } = useAudioCapture();
  const { isModelLoaded: whisperLoaded, transcribe, loadModel: loadWhisper } = useTranscription();
  const { searchSemantic, isLoaded: semanticLoaded } = useSemanticWorker();

  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  const pushToProjection = useCallback(
    (verse: any) => {
      const v = normalise(verse);
      projection.projectVerse(v);
      scripture.setActiveVerse(v);
      scripture.addToHistory(v.ref || v.reference || "");
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: v });
    },
    [projection, scripture],
  );

  const fetchVersesAndProject = useCallback(
    async (references: string[]) => {
      if (!references?.length) return;
      const apiCode = getApiCode(scripture.activeTranslation);
      try {
        const verses = await fetchMultipleVerses(references, apiCode);
        if (verses.length > 0) {
          scripture.setResults(verses.map(normalise));
          pushToProjection(verses[0]);
        }
      } catch (err) {
        console.error("fetchVersesAndProject failed:", err);
      }
    },
    [scripture, pushToProjection],
  );

  const processTranscriptChunk = useCallback(
    async (text: string) => {
      if (!text || text.length < 3) return;
      store.setProcessing(true);
      store.appendTranscript(text);
      scripture.setTranscript(text);

      const { matches, explicit, implicit } = (() => {
        const regex = extractScriptureFromText(text);
        const ctx = analyzeWithContext(text);
        return { matches: regex.matches, ...ctx };
      })();

      const refs = [...explicit, ...implicit]
        .filter((m) => m.confidence !== "low")
        .map((m) => `${m.book} ${m.chapter}:${m.verse}`);

      const deduped = [...new Set(refs)];

      if (deduped.length > 0) {
        await fetchVersesAndProject(deduped);
      }

      if (deduped.length === 0 && semanticLoaded) {
        try {
          const results = await searchSemantic(text);
          if (results.length > 0) {
            const best = results[0];
            if (best.score > 0.55) {
              scripture.setDetectionResult({
                verse: null,
                book: best.book,
                chapter: best.chapter,
                confidence: Math.round(best.score * 100),
                source: "semantic",
              });
            }
          }
        } catch {
          // fallback to regex only
        }
      }

      store.setProcessing(false);
    },
    [store, scripture, fetchVersesAndProject, semanticLoaded, searchSemantic],
  );

  const audioCallback = useCallback(
    async (blob: Blob) => {
      if (!whisperLoaded) return;

      try {
        store.setProcessing(true);

        let text = "";
        if (isCloudflareConfigured()) {
          text = await transcribeViaCloudflare(blob);
        } else if (isLovableGatewayConfigured()) {
          text = await transcribeViaLovable(blob);
        } else {
          const float32 = await audioBlobToFloat32(blob);
          text = await transcribe(float32.buffer as ArrayBuffer);
        }

        if (text && text.length > 3) {
          await processTranscriptChunk(text);
        }
      } catch (err) {
        console.error("Audio transcription error:", err);
      } finally {
        store.setProcessing(false);
      }
    },
    [whisperLoaded, transcribe, processTranscriptChunk, store],
  );

  const startListening = useCallback(async () => {
    try {
      store.setError(null);
      store.resetDetection();
      store.setListening(true);

      await startCapture(audioCallback);
      store.setStreamActive(true);
      setModelsReady(true);
      resetContext();

      loadWhisper().then((ready) => {
        if (!ready) {
          console.warn("Whisper model failed to load — transcription unavailable");
        }
      });
    } catch {
      store.setError("Microphone access denied");
      store.setListening(false);
    }
  }, [loadWhisper, startCapture, audioCallback, store]);

  const stopListening = useCallback(() => {
    stopCapture();
    store.setListening(false);
    store.setProcessing(false);
    store.setStreamActive(false);
    store.clearTranscript();
    scripture.clearDetection();
    resetContext();
  }, [stopCapture, store, scripture]);

  const detectText = useCallback(
    async (text: string) => {
      await processTranscriptChunk(text);
    },
    [processTranscriptChunk],
  );

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    stream,
    audioLevel,
    isListening: store.isListening,
    isProcessing: store.isProcessing,
    error: store.error,
    whisperLoaded,
    semanticLoaded,
    modelsReady,
    sensitivity: store.sensitivity,
    transcript: store.transcript,
    detectedVerse: store.detectedVerse,
    startListening,
    stopListening,
    detectText,
    pushToProjection,
    fetchVerses: fetchVersesAndProject,
  };
}
