import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Verse } from "../api/bible";
import type { MatchRange } from "../utils/distance";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  detectedRef?: string;
}

interface SoundState {
  isListening: boolean;
  transcript: string;
  recentChunk: string;
  detectedVerse: Verse | null;
  confidence: number;
  sensitivity: "low" | "medium" | "high";
  matchRange: MatchRange;
  isProcessing: boolean;
  audioLevel: number;
  currentBook: string | null;
  currentChapter: number | null;
  lastDetectionTime: number | null;
  error: string | null;
  aiMode: boolean;
  whisperModelLoaded: boolean;
  semanticModelLoaded: boolean;
  whisperProgress: { status: string; loaded: number; total: number };
  semanticProgress: { status: string; loaded: number; total: number };
  micMuted: boolean;
  streamActive: boolean;
  status: { whisper: "idle" | "loading" | "ready"; miniLM: "idle" | "loading" | "ready" };
  transcriptHistory: TranscriptSegment[];
  transcriptView: "live" | "history";
  useDeepgramFlux: boolean;

  setListening: (b: boolean) => void;
  setUseDeepgramFlux: (b: boolean) => void;
  appendToken: (text: string, isFinal: boolean) => void;
  appendTranscript: (text: string) => void;
  setTranscript: (t: string) => void;
  setRecentChunk: (t: string) => void;
  setDetectedVerse: (v: Verse | null) => void;
  setAudioLevel: (n: number) => void;
  setSensitivity: (s: "low" | "medium" | "high") => void;
  setMatchRange: (r: MatchRange) => void;
  setProcessing: (b: boolean) => void;
  setError: (e: string | null) => void;
  setAiMode: (b: boolean) => void;
  setWhisperModelLoaded: (b: boolean) => void;
  setSemanticModelLoaded: (b: boolean) => void;
  setWhisperProgress: (status: string, loaded: number, total: number) => void;
  setSemanticProgress: (status: string, loaded: number, total: number) => void;
  setMicMuted: (b: boolean) => void;
  setStreamActive: (b: boolean) => void;
  clearTranscript: () => void;
  resetDetection: () => void;
  reset: () => void;
  appendToHistory: (text: string, detectedRef?: string) => void;
  setTranscriptView: (v: "live" | "history") => void;
  clearHistory: () => void;
}

const initialData = {
  isListening: false,
  transcript: "",
  recentChunk: "",
  detectedVerse: null as Verse | null,
  confidence: 0,
  sensitivity: "high" as const,
  matchRange: "balanced" as MatchRange,
  isProcessing: false,
  audioLevel: 0,
  currentBook: null as string | null,
  currentChapter: null as number | null,
  lastDetectionTime: null as number | null,
  error: null as string | null,
  aiMode: false,
  whisperModelLoaded: false,
  semanticModelLoaded: false,
  whisperProgress: { status: "idle" as string, loaded: 0, total: 0 },
  semanticProgress: { status: "idle" as string, loaded: 0, total: 0 },
  micMuted: false,
  streamActive: false,
  status: {
    whisper: "ready" as "idle" | "loading" | "ready",
    miniLM: "ready" as "idle" | "loading" | "ready",
  },
  transcriptHistory: [],
  transcriptView: "live" as const,
  useDeepgramFlux: false,
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      ...initialData,
      setUseDeepgramFlux: (useDeepgramFlux) => set({ useDeepgramFlux }),

      setListening: (isListening) => set({ isListening }),
      appendToken: (text, isFinal) =>
        set((state: SoundState) => ({
          recentChunk: isFinal ? state.recentChunk + " " + text : text,
          transcript: isFinal ? state.transcript + " " + text : state.transcript,
        })),
      appendTranscript: (text) =>
        set((state) => {
          const lines = (state.transcript + " " + text).split("\n");
          const kept = lines.slice(-300).join("\n");
          const segment: TranscriptSegment = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: Date.now(),
          };
          return {
            transcript: kept,
            recentChunk: text,
            transcriptHistory: [...state.transcriptHistory, segment],
          };
        }),
      setTranscript: (transcript) => set({ transcript }),
      setRecentChunk: (recentChunk) => set({ recentChunk }),
      setDetectedVerse: (verse) =>
        set({
          detectedVerse: verse,
          lastDetectionTime: verse ? Date.now() : null,
        }),
      setAudioLevel: (audioLevel) => set({ audioLevel }),
      setSensitivity: (sensitivity) => set({ sensitivity }),
      setMatchRange: (matchRange) => set({ matchRange }),
      setProcessing: (isProcessing) => set({ isProcessing }),
      setError: (error) => set({ error }),
      setAiMode: (aiMode) => set({ aiMode }),
      setWhisperModelLoaded: (whisperModelLoaded) => set({ whisperModelLoaded }),
      setSemanticModelLoaded: (semanticModelLoaded) => set({ semanticModelLoaded }),
      setWhisperProgress: (status, loaded, total) =>
        set({ whisperProgress: { status, loaded, total } }),
      setSemanticProgress: (status, loaded, total) =>
        set({ semanticProgress: { status, loaded, total } }),
      setMicMuted: (micMuted) => set({ micMuted }),
      setStreamActive: (streamActive) => set({ streamActive }),
      clearTranscript: () => set({ transcript: "", recentChunk: "" }),
      appendToHistory: (text, detectedRef) =>
        set((state) => {
          const segment: TranscriptSegment = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: Date.now(),
            detectedRef,
          };
          return { transcriptHistory: [...state.transcriptHistory, segment] };
        }),
      setTranscriptView: (transcriptView) => set({ transcriptView }),
      clearHistory: () => set({ transcriptHistory: [] }),
      resetDetection: () =>
        set({
          detectedVerse: null,
          confidence: 0,
          lastDetectionTime: null,
          currentBook: null,
          currentChapter: null,
        }),
      reset: () => set({ ...initialData }),
    }),
    {
      name: "scriptureflow-sound",
      partialize: (state) => ({
        sensitivity: state.sensitivity,
        matchRange: state.matchRange,
        aiMode: state.aiMode,
        micMuted: state.micMuted,
        transcriptHistory: state.transcriptHistory,
        useDeepgramFlux: state.useDeepgramFlux,
      }),
    },
  ),
);
