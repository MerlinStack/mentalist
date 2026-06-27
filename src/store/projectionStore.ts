import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Verse } from "../api/bible";

interface ProjectionState {
  currentVerse: Verse | null;
  theme: "dark" | "light" | "warm";
  fontSize: "medium" | "large" | "xlarge";
  showReference: boolean;
  showTranslation: boolean;
  queue: Verse[];
  isProjecting: boolean;
  projectVerse: (verse: Verse) => void;
  clearProjection: () => void;
  setIsProjecting: (b: boolean) => void;
  setTheme: (t: "dark" | "light" | "warm") => void;
  setFontSize: (s: "medium" | "large" | "xlarge") => void;
  setShowReference: (b: boolean) => void;
  setShowTranslation: (b: boolean) => void;
  addToQueue: (verse: Verse) => void;
  removeFromQueue: (index: number) => void;
  projectNext: () => void;
}

export const themeConfig = {
  dark: { bg: "#000000", text: "#FFFFFF", accent: "#4F6BFF", name: "Dark" },
  light: { bg: "#FFFFFF", text: "#1A1A2E", accent: "#4F6BFF", name: "Light" },
  warm: { bg: "#2D1B00", text: "#FFE4B5", accent: "#FFD580", name: "Warm" },
} as const;

export function resolveTheme(name: string) {
  return themeConfig[name as keyof typeof themeConfig] || themeConfig.dark;
}

export function resolveFontSize(name: string): number {
  const sizes: Record<string, number> = { medium: 28, large: 42, xlarge: 64 };
  return sizes[name] || 42;
}

export const useProjectionStore = create<ProjectionState>()(
  persist(
    (set, get) => ({
      currentVerse: null,
      theme: "dark",
      fontSize: "large",
      showReference: true,
      showTranslation: true,
      queue: [],
      isProjecting: false,

      projectVerse: (verse) => {
        const ref = verse.ref || verse.reference || "";
        set({ currentVerse: { ...verse, ref, reference: ref }, isProjecting: true });
      },

      clearProjection: () => set({ currentVerse: null }),
      setIsProjecting: (isProjecting) => set({ isProjecting }),

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowReference: (showReference) => set({ showReference }),
      setShowTranslation: (showTranslation) => set({ showTranslation }),

      addToQueue: (verse) =>
        set((state) => ({
          queue: state.queue.length >= 10 ? state.queue : [...state.queue, verse],
        })),

      removeFromQueue: (index) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
        })),

      projectNext: () => {
        const state = get();
        if (state.queue.length > 0) {
          const next = state.queue[0];
          set({
            currentVerse: next,
            queue: state.queue.slice(1),
            isProjecting: true,
          });
        }
      },
    }),
    {
      name: "scriptureflow-projection",
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        showReference: state.showReference,
        showTranslation: state.showTranslation,
      }),
    },
  ),
);
