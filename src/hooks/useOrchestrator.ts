import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundStore } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useProjectionStore } from "../store/projectionStore";
import { useAudioCapture } from "./useAudioCapture";
import { useTranscription } from "./useTranscription";
import { useSemanticWorker } from "./useSemanticWorker";
import type { Verse } from "../api/bible";
import { extractScriptureFromText } from "../engine/regexEngine";
import { analyzeWithContext, resetContext } from "../engine/contextEngine";
import { audioBlobToFloat32 } from "../audio/downsample";
import { isCloudflareConfigured, transcribeViaCloudflare } from "../gateway/cloudflare";
import { isLovableGatewayConfigured, transcribeViaLovable } from "../gateway/lovable";
import { lookupEngine } from "../services/scriptureLookup";
import { getDistanceThresholds } from "../utils/distance";

const ACCUMULATION_WINDOW = 400;
const MIN_CHUNK_LENGTH = 15;

function normalise(v: any) {
  const ref = v.ref || v.reference || "";
  return { ...v, ref, reference: ref };
}

export function useOrchestrator() {
  const store = useSoundStore();
  const scripture = useScriptureStore();
  const projection = useProjectionStore();
  const channelRef = useRef<BroadcastChannel | null>(null);

  const { stream, audioLevel, frequencyData, startCapture, stopCapture } = useAudioCapture();
  const { isModelLoaded: whisperLoaded, transcribe, loadModel: loadWhisper } = useTranscription();
  const { searchSemantic, loadEmbeddings, isLoaded: semanticLoaded } = useSemanticWorker();

  const [modelsReady, setModelsReady] = useState(false);
  const accumulationRef = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({
    text: "",
    timer: null,
  });
  const lastProcessedRef = useRef<string>("");

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => {
      channelRef.current?.close();
      if (accumulationRef.current.timer) {
        clearTimeout(accumulationRef.current.timer);
      }
    };
  }, []);

  // Load full KJV corpus into inverted-token lookup engine
  useEffect(() => {
    fetch("/bible/verses.json")
      .then((r) => {
        if (!r.ok) throw new Error("verses.json not found — run npm run generate-embeddings");
        return r.json();
      })
      .then((verses) => {
        const start = performance.now();
        const mapped = verses.map((v: any) => ({
          b: v.book,
          c: v.chapter,
          v: v.verse,
          t: v.text,
        }));
        lookupEngine.loadDatabase(mapped);
        console.log(
          `Lookup engine loaded ${mapped.length} verses in ${(performance.now() - start).toFixed(0)}ms`,
        );
      })
      .catch((err) => console.warn("Lookup engine unavailable:", err.message));
  }, []);

  // Eagerly load Whisper model on mount (not deferred until mic toggle)
  useEffect(() => {
    loadWhisper().then((ready) => {
      if (!ready) console.warn("Whisper model failed to load — transcription unavailable");
    });
  }, [loadWhisper]);

  // Auto-load pre-computed embeddings into semantic worker once ready
  useEffect(() => {
    if (!semanticLoaded) return;
    fetch("/bible/embeddings.json")
      .then((r) => {
        if (!r.ok) throw new Error("embeddings.json not found — run npm run generate-embeddings");
        return r.json();
      })
      .then((embeddings) => {
        if (embeddings.length > 0) {
          loadEmbeddings(embeddings);
        }
      })
      .catch((err) => console.warn("Semantic embeddings unavailable:", err.message));
  }, [semanticLoaded, loadEmbeddings]);

  const pushToProjection = useCallback(
    (verse: any) => {
      const v = normalise(verse);
      projection.projectVerse(v);
      scripture.setActiveVerse(v);
      scripture.addToHistory(v.ref || v.reference || "");
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: v });
      try { localStorage.setItem("mentalist_projection_verse", JSON.stringify(v)); } catch {}
    },
    [projection, scripture],
  );

  const fetchVersesAndProject = useCallback(
    async (references: string[]) => {
      if (!references?.length) return;
      const verses: Verse[] = [];
      for (const ref of references) {
        const v = lookupEngine.getVerseByRef(ref);
        if (v) {
          verses.push({
            reference: ref,
            ref,
            text: v.t,
            book: v.b,
            chapter: v.c,
            verse: v.v,
          });
        }
      }
      if (verses.length > 0) {
        scripture.setResults(verses);
        pushToProjection(verses[0]);
      }
    },
    [scripture, pushToProjection],
  );

  const processTranscriptChunk = useCallback(
    async (text: string, force = false) => {
      if (!text || text.length < 1) return;

      if (accumulationRef.current.timer) {
        clearTimeout(accumulationRef.current.timer);
        accumulationRef.current.timer = null;
      }

      const acc = accumulationRef.current;
      const merged = acc.text ? `${acc.text} ${text}` : text;
      acc.text = merged;

      const processNow = async () => {
        const finalText = acc.text;
        acc.text = "";
        if (!finalText || finalText.length < 3) return;
        if (finalText === lastProcessedRef.current) return;
        lastProcessedRef.current = finalText;

        store.setProcessing(true);
        store.appendTranscript(finalText);
        scripture.setTranscript(finalText);

        const { explicit, implicit } = analyzeWithContext(finalText);

        const refs = [...explicit, ...implicit]
          .filter((m) => m.confidence !== "low")
          .map((m) => `${m.book} ${m.chapter}:${m.verse}`);

        const deduped = [...new Set(refs)];

        if (deduped.length > 0) {
          store.appendToHistory(finalText, deduped[0]);
          fetchVersesAndProject(deduped);
          store.setProcessing(false);
          return;
        }

        const { tokenThreshold, semanticThreshold } = getDistanceThresholds(
          useSoundStore.getState().matchRange,
        );

        const fastMatch = lookupEngine.reverseLookup(finalText, tokenThreshold);
        if (fastMatch) {
          store.setDetectedVerse({
            reference: fastMatch.ref,
            text: fastMatch.text,
            book: fastMatch.book,
            chapter: fastMatch.chapter,
            verse: fastMatch.verse,
            translation: scripture.activeTranslation,
            ref: fastMatch.ref,
          });
          fetchVersesAndProject([fastMatch.ref]);
          store.setProcessing(false);
          return;
        }

        if (semanticLoaded) {
          try {
            const results = await searchSemantic(finalText);
            if (results.length > 0) {
              const best = results[0];
              if (best.score > semanticThreshold) {
                const refStr = `${best.book} ${best.chapter}:${best.verse}`;
                store.setDetectedVerse({
                  reference: refStr,
                  text: "",
                  book: best.book,
                  chapter: best.chapter,
                  verse: best.verse,
                  translation: scripture.activeTranslation,
                  ref: refStr,
                });
                fetchVersesAndProject([refStr]);
              }
            }
          } catch (e) {
            console.warn("Semantic search failed:", e);
          }
        }

        store.setProcessing(false);
      };

      if (force || merged.length >= MIN_CHUNK_LENGTH) {
        await processNow();
      } else {
        acc.timer = setTimeout(processNow, ACCUMULATION_WINDOW);
      }
    },
    [store, scripture, fetchVersesAndProject, semanticLoaded, searchSemantic],
  );

  const pendingChunksRef = useRef<Blob[]>([]);
  const processingChunkRef = useRef(false);

  const audioCallback = useCallback(
    async (blob: Blob) => {
      if (!whisperLoaded) {
        pendingChunksRef.current.push(blob);
        return;
      }

      pendingChunksRef.current.push(blob);
      if (processingChunkRef.current) return;
      processingChunkRef.current = true;

      try {
        while (pendingChunksRef.current.length > 0) {
          const chunk = pendingChunksRef.current.shift()!;
          store.setProcessing(true);
          let text = "";
          try {
            if (isCloudflareConfigured()) {
              text = await transcribeViaCloudflare(chunk);
            } else if (isLovableGatewayConfigured()) {
              text = await transcribeViaLovable(chunk);
            } else {
              const float32 = await audioBlobToFloat32(chunk);
              text = await transcribe(float32);
            }
            if (text && text.length > 0) {
              await processTranscriptChunk(text, true);
            }
          } catch (err) {
            console.error("Audio transcription error:", err);
          } finally {
            store.setProcessing(false);
          }
        }
      } finally {
        processingChunkRef.current = false;
      }
    },
    [whisperLoaded, transcribe, processTranscriptChunk, store],
  );

  const startListening = useCallback(async () => {
    try {
      store.setError(null);
      store.resetDetection();
      store.setListening(true);

      const whisperReady = await loadWhisper();
      if (!whisperReady) {
        console.warn("Whisper model failed to load — transcription unavailable");
      }

      await startCapture(audioCallback);
      store.setStreamActive(true);
      setModelsReady(true);
      resetContext();
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
      await processTranscriptChunk(text, true);
    },
    [processTranscriptChunk],
  );

  const searchUtterance = useCallback(
    async (text: string) => {
      if (!text || text.length < 3) return;
      const { explicit, implicit } = analyzeWithContext(text);
      const refs = [...explicit, ...implicit]
        .filter((m) => m.confidence !== "low")
        .map((m) => `${m.book} ${m.chapter}:${m.verse}`);
      const deduped = [...new Set(refs)];

      if (deduped.length > 0) {
        await fetchVersesAndProject(deduped);
        return;
      }

      const { tokenThreshold, semanticThreshold } = getDistanceThresholds(
        useSoundStore.getState().matchRange,
      );

      const fastMatch = lookupEngine.reverseLookup(text, tokenThreshold);
      if (fastMatch) {
        store.setDetectedVerse({
          reference: fastMatch.ref,
          text: fastMatch.text,
          book: fastMatch.book,
          chapter: fastMatch.chapter,
          verse: fastMatch.verse,
          translation: scripture.activeTranslation,
          ref: fastMatch.ref,
        });
        await fetchVersesAndProject([fastMatch.ref]);
        return;
      }

      if (!semanticLoaded) return;
      try {
        const results = await searchSemantic(text);
        if (results.length > 0) {
          const best = results[0];
          if (best.score > semanticThreshold) {
            const refStr = `${best.book} ${best.chapter}:${best.verse}`;
            store.setDetectedVerse({
              reference: refStr,
              text: "",
              book: best.book,
              chapter: best.chapter,
              verse: best.verse,
              translation: scripture.activeTranslation,
              ref: refStr,
            });
            await fetchVersesAndProject([refStr]);
          }
        }
      } catch (e) {
        console.warn("Search utterance semantic fallback failed:", e);
      }
    },
    [store, scripture, fetchVersesAndProject, semanticLoaded, searchSemantic],
  );

  const searchPreview = useCallback(
    async (text: string) => {
      if (!text || text.length < 3) return;
      const { explicit, implicit } = analyzeWithContext(text);
      const refs = [...explicit, ...implicit]
        .filter((m) => m.confidence !== "low")
        .map((m) => `${m.book} ${m.chapter}:${m.verse}`);
      const deduped = [...new Set(refs)];

      if (deduped.length > 0) {
        await fetchVersesAndProject(deduped);
        return;
      }

      const { tokenThreshold, semanticThreshold } = getDistanceThresholds(
        useSoundStore.getState().matchRange,
      );

      const fastMatch = lookupEngine.reverseLookup(text, tokenThreshold);
      if (fastMatch) {
        store.setDetectedVerse({
          reference: fastMatch.ref,
          text: fastMatch.text,
          book: fastMatch.book,
          chapter: fastMatch.chapter,
          verse: fastMatch.verse,
          translation: scripture.activeTranslation,
          ref: fastMatch.ref,
        });
        await fetchVersesAndProject([fastMatch.ref]);
        return;
      }

      if (!semanticLoaded) return;
      try {
        const results = await searchSemantic(text);
        if (results.length > 0) {
          const best = results[0];
          if (best.score > semanticThreshold) {
            const refStr = `${best.book} ${best.chapter}:${best.verse}`;
            store.setDetectedVerse({
              reference: refStr,
              text: "",
              book: best.book,
              chapter: best.chapter,
              verse: best.verse,
              translation: scripture.activeTranslation,
              ref: refStr,
            });
            await fetchVersesAndProject([refStr]);
          }
        }
      } catch (e) {
        console.warn("Search preview semantic fallback failed:", e);
      }
    },
    [store, scripture, fetchVersesAndProject, semanticLoaded, searchSemantic],
  );

  const searchReferences = useCallback(
    async (text: string): Promise<void> => {
      if (!text || text.length < 3) return;
      const verseMap = new Map<
        string,
        { ref: string; book: string; chapter: number; verse: number; text: string; score: number }
      >();
      const addResult = (book: string, ch: number, vs: number, txt: string, score: number) => {
        const ref = `${book} ${ch}:${vs}`;
        if (verseMap.has(ref) && verseMap.get(ref)!.score >= score) return;
        verseMap.set(ref, { ref, book, chapter: ch, verse: vs, text: txt, score });
      };

      const { tokenThreshold, semanticThreshold } = getDistanceThresholds(
        useSoundStore.getState().matchRange,
      );

      const { explicit, implicit } = analyzeWithContext(text);
      for (const m of [...explicit, ...implicit]) {
        if (m.confidence === "low") continue;
        const txt = lookupEngine.getVerseText(m.book, m.chapter, m.verse) || "";
        addResult(m.book, m.chapter, m.verse, txt, 100);
      }

      const tokenResults = lookupEngine.reverseLookupTopN(text, tokenThreshold, 8);
      for (const r of tokenResults) {
        addResult(r.book, r.chapter, r.verse, r.text, r.confidence);
      }

      if (semanticLoaded) {
        try {
          const semanticResults = await searchSemantic(text);
          for (const r of semanticResults) {
            if (r.score > semanticThreshold) {
              const txt = lookupEngine.getVerseText(r.book, r.chapter, r.verse) || "";
              addResult(r.book, r.chapter, r.verse, txt, Math.round(r.score * 100));
            }
          }
        } catch (e) {
          console.warn("Search references semantic failed:", e);
        }
      }

      const sorted = [...verseMap.values()].sort((a, b) => b.score - a.score).slice(0, 15);
      scripture.setResults(sorted.map((v) => ({ ...v, reference: v.ref })));
    },
    [scripture, semanticLoaded, searchSemantic],
  );

  const findRelated = useCallback(
    async (verseText: string): Promise<void> => {
      if (!semanticLoaded || !verseText || verseText.length < 5) return;
      try {
        const results = await searchSemantic(verseText);
        const { semanticThreshold } = getDistanceThresholds(useSoundStore.getState().matchRange);
        const related = results
          .filter((r) => r.score > semanticThreshold)
          .slice(0, 6)
          .map((r) => {
            const txt = lookupEngine.getVerseText(r.book, r.chapter, r.verse) || "";
            return {
              reference: `${r.book} ${r.chapter}:${r.verse}`,
              ref: `${r.book} ${r.chapter}:${r.verse}`,
              book: r.book,
              chapter: r.chapter,
              verse: r.verse,
              text: txt,
              score: Math.round(r.score * 100),
            };
          });
        if (related.length > 0) {
          scripture.setRelatedReferences(related);
        }
      } catch (e) {
        console.warn("Find related semantic failed:", e);
      }
    },
    [semanticLoaded, searchSemantic],
  );

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    stream,
    audioLevel,
    frequencyData,
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
    searchUtterance,
    searchPreview,
    searchReferences,
    findRelated,
    pushToProjection,
    fetchVerses: fetchVersesAndProject,
  };
}
