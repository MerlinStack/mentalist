import { useCallback, useEffect, useRef } from "react";
import { useSoundStore } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useProjectionStore } from "../store/projectionStore";
import { useAudioCapture } from "./useAudioCapture";
import { useTranscription } from "./useTranscription";
import { useVerseDetector } from "./useVerseDetector";
import { fetchMultipleVerses } from "../api/bible";
import { getApiCode } from "../data/versions";

function normalise(verse) {
  const ref = verse.ref || verse.reference || "";
  return { ...verse, ref, reference: ref };
}

export function useAISoundMode() {
  const isListening = useSoundStore((s) => s.isListening);
  const isProcessing = useSoundStore((s) => s.isProcessing);
  const error = useSoundStore((s) => s.error);
  const setListening = useSoundStore((s) => s.setListening);
  const setProcessing = useSoundStore((s) => s.setProcessing);
  const setError = useSoundStore((s) => s.setError);
  const setDetectedVerse = useSoundStore((s) => s.setDetectedVerse);
  const setWhisperModelLoaded = useSoundStore((s) => s.setWhisperModelLoaded);
  const setSemanticModelLoaded = useSoundStore((s) => s.setSemanticModelLoaded);
  const sensitivity = useSoundStore((s) => s.sensitivity);
  const activeTranslation = useScriptureStore((s) => s.activeTranslation);
  const setTranscript = useScriptureStore((s) => s.setTranscript);
  const setResults = useScriptureStore((s) => s.setResults);
  const addToHistory = useScriptureStore((s) => s.addToHistory);

  const channelRef = useRef(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("dmentalist-projection");
    return () => channelRef.current?.close();
  }, []);

  const { stream, audioLevel, startCapture, stopCapture } = useAudioCapture();
  const {
    isModelLoaded: whisperLoaded,
    isTranscribing,
    transcript,
    loadModel: loadWhisper,
    transcribe,
  } = useTranscription();
  const {
    isSemanticLoaded: semanticLoaded,
    isSearching,
    detect,
    loadSemanticModel,
  } = useVerseDetector();

  const fetchAndProject = useCallback(
    async (references) => {
      if (!references?.length) return;
      const translation = getApiCode(activeTranslation);
      try {
        const verses = await fetchMultipleVerses(references, translation);
        if (!verses.length) return;
        const verse = normalise(verses[0]);
        setResults(verses.map(normalise));
        addToHistory(verse.ref);
        useProjectionStore.getState().projectVerse(verse);
        channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse });
      } catch (err) {
        console.error("fetchAndProject failed:", err);
      }
    },
    [activeTranslation, setResults, addToHistory],
  );

  useEffect(() => {
    if (whisperLoaded) setWhisperModelLoaded(true);
  }, [whisperLoaded, setWhisperModelLoaded]);

  useEffect(() => {
    if (semanticLoaded) setSemanticModelLoaded(true);
  }, [semanticLoaded, setSemanticModelLoaded]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setDetectedVerse(null);
      setListening(true);

      const whisperReady = await loadWhisper();
      if (!whisperReady) {
        setError("Failed to load Whisper model");
        setListening(false);
        return;
      }

      await loadSemanticModel();

      await startCapture(async (audioChunk) => {
        setProcessing(true);
        try {
          const text = await transcribe(audioChunk);
          if (text && text.length > 3) {
            setTranscript(text);
            detect(text);
          }
        } catch {
          setError("Transcription failed");
        }
        setProcessing(false);
      });
    } catch {
      setError("Microphone access denied");
      setListening(false);
    }
  }, [
    loadWhisper,
    loadSemanticModel,
    startCapture,
    transcribe,
    detect,
    setError,
    setListening,
    setDetectedVerse,
    setProcessing,
    setTranscript,
  ]);

  const stopListening = useCallback(() => {
    stopCapture();
    setListening(false);
    setProcessing(false);
    setTranscript("");
    useScriptureStore.getState().clearDetection();
  }, [stopCapture, setListening, setProcessing, setTranscript]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    stream,
    audioLevel,
    isListening,
    isProcessing: isProcessing || isTranscribing || isSearching,
    error,
    whisperLoaded,
    semanticLoaded,
    sensitivity,
    startListening,
    stopListening,
  };
}
