import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TTSProvider = "browser" | "cloudflare-aura";

export interface TTSQueueItem {
  id: string;
  text: string;
  verseRef?: string;
}

interface TTSState {
  enabled: boolean;
  provider: TTSProvider;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  isSpeaking: boolean;
  isPaused: boolean;
  queue: TTSQueueItem[];

  setEnabled: (b: boolean) => void;
  setProvider: (p: TTSProvider) => void;
  setVoice: (v: string) => void;
  setRate: (r: number) => void;
  setPitch: (p: number) => void;
  setVolume: (v: number) => void;
  setIsSpeaking: (b: boolean) => void;
  setIsPaused: (b: boolean) => void;
  addToQueue: (item: TTSQueueItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  shiftQueue: () => TTSQueueItem | undefined;
}

export const useTTSStore = create<TTSState>()(
  persist(
    (set, get) => ({
      enabled: false,
      provider: "browser",
      voice: "",
      rate: 1,
      pitch: 1,
      volume: 1,
      isSpeaking: false,
      isPaused: false,
      queue: [],

      setEnabled: (enabled) => set({ enabled }),
      setProvider: (provider) => set({ provider }),
      setVoice: (voice) => set({ voice }),
      setRate: (rate) => set({ rate }),
      setPitch: (pitch) => set({ pitch }),
      setVolume: (volume) => set({ volume }),
      setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
      setIsPaused: (isPaused) => set({ isPaused }),

      addToQueue: (item) => set((state) => ({ queue: [...state.queue, item] })),

      removeFromQueue: (id) => set((state) => ({ queue: state.queue.filter((i) => i.id !== id) })),

      clearQueue: () => set({ queue: [] }),

      shiftQueue: () => {
        const state = get();
        if (state.queue.length === 0) return undefined;
        const next = state.queue[0];
        set({ queue: state.queue.slice(1) });
        return next;
      },
    }),
    {
      name: "scriptureflow-tts",
      partialize: (state) => ({
        enabled: state.enabled,
        provider: state.provider,
        voice: state.voice,
        rate: state.rate,
        pitch: state.pitch,
        volume: state.volume,
      }),
    },
  ),
);
