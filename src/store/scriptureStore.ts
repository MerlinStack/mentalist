import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Verse } from "../api/bible";
import { lookupEngine } from "../services/scriptureLookup";

interface UsageData {
  searchesToday: number;
  searchesWeek: number;
  topQueries: { query: string; count: number }[];
  dailyLog: Record<string, number>;
}

const USAGE_KEY = "scriptureflow-usage";

function loadUsage(): UsageData {
  try {
    return (
      JSON.parse(localStorage.getItem(USAGE_KEY)!) || {
        searchesToday: 0,
        searchesWeek: 0,
        topQueries: [],
        dailyLog: {},
      }
    );
  } catch {
    return { searchesToday: 0, searchesWeek: 0, topQueries: [], dailyLog: {} };
  }
}

function saveUsage(data: UsageData) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

interface ScriptureState {
  query: string;
  results: Verse[];
  activeVerse: Verse | null;
  relatedReferences: Verse[];
  isSearching: boolean;
  searchError: string | null;
  searchHistory: { query: string; timestamp: number }[];
  activeTranslation: string;
  searchMode: string;
  currentBook: string | null;
  currentChapter: number | null;
  confidence: number;
  lastDetectionTime: number | null;
  isListening: boolean;
  transcript: string;
  detectionSource: string | null;
  setQuery: (q: string) => void;
  setSearchMode: (m: string) => void;
  setResults: (r: Verse[]) => void;
  setActiveVerse: (v: Verse | null) => void;
  setRelatedReferences: (r: Verse[]) => void;
  setSearching: (b: boolean) => void;
  setSearchError: (e: string | null) => void;
  setTranslation: (t: string) => void;
  setCurrentBook: (b: string | null) => void;
  setCurrentChapter: (c: number | null) => void;
  setConfidence: (c: number) => void;
  setLastDetectionTime: (t: number | null) => void;
  setListening: (b: boolean) => void;
  setTranscript: (t: string) => void;
  setDetectionSource: (s: string | null) => void;
  setDetectionResult: (r: {
    verse: Verse | null;
    book: string | null;
    chapter: number | null;
    confidence: number;
    source: string | null;
  }) => void;
  addToHistory: (q: string) => void;
  clearHistory: () => void;
  clearResults: () => void;
  clearDetection: () => void;
  loadChapter: (book: string, chapter: number) => Promise<void>;
}

export const useScriptureStore = create<ScriptureState>()(
  persist(
    (set, get) => ({
      query: "",
      results: [],
      activeVerse: null,
      relatedReferences: [],
      isSearching: false,
      searchError: null,
      searchHistory: [],
      activeTranslation: "KJV",
      searchMode: "Quote",

      currentBook: null,
      currentChapter: null,
      confidence: 0,
      lastDetectionTime: null,
      isListening: false,
      transcript: "",
      detectionSource: null,

      setQuery: (query) => set({ query }),
      setSearchMode: (searchMode) => set({ searchMode }),
      setSearching: (isSearching) => set({ isSearching }),
      setSearchError: (searchError) => set({ searchError }),
      setResults: (results) => set({ results }),
      setTranslation: (activeTranslation) => set({ activeTranslation }),
      setActiveVerse: (verse) => set({ activeVerse: verse }),
      setRelatedReferences: (relatedReferences) => set({ relatedReferences }),
      setCurrentBook: (currentBook) => set({ currentBook }),
      setCurrentChapter: (currentChapter) => set({ currentChapter }),
      setConfidence: (confidence) => set({ confidence }),
      setLastDetectionTime: (lastDetectionTime) => set({ lastDetectionTime }),
      setListening: (isListening) => set({ isListening }),
      setTranscript: (transcript) => set({ transcript }),
      setDetectionSource: (detectionSource) => set({ detectionSource }),

      setDetectionResult: ({ verse, book, chapter, confidence, source }) => {
        set({
          activeVerse: verse,
          currentBook: book,
          currentChapter: chapter,
          confidence,
          lastDetectionTime: Date.now(),
          detectionSource: source,
        });
      },

      addToHistory: (query) => {
        const history = [
          { query, timestamp: Date.now() },
          ...get().searchHistory.filter((h) => h.query !== query),
        ].slice(0, 20);
        set({ searchHistory: history });

        const usage = loadUsage();
        const today = new Date().toISOString().split("T")[0];
        usage.dailyLog[today] = (usage.dailyLog[today] || 0) + 1;
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        const weekDays = Object.entries(usage.dailyLog).filter(([d]) => d >= weekKey);
        usage.searchesToday = usage.dailyLog[today] || 0;
        usage.searchesWeek = weekDays.reduce((s, [, c]) => s + c, 0);

        const existing = usage.topQueries.find((q) => q.query === query);
        if (existing) {
          existing.count++;
        } else {
          usage.topQueries.push({ query, count: 1 });
        }
        usage.topQueries.sort((a, b) => b.count - a.count);
        usage.topQueries = usage.topQueries.slice(0, 20);
        saveUsage(usage);
      },

      clearHistory: () => set({ searchHistory: [] }),
      clearResults: () => set({ results: [], activeVerse: null, relatedReferences: [], searchError: null }),

      clearDetection: () =>
        set({
          activeVerse: null,
          currentBook: null,
          currentChapter: null,
          confidence: 0,
          lastDetectionTime: null,
          detectionSource: null,
        }),

      loadChapter: (book, chapter) => {
        const chapterVerses = lookupEngine.getChapter(book, chapter);
        set({
          results: chapterVerses.map((v) => ({
            reference: `${v.b} ${v.c}:${v.v}`,
            text: v.t,
            book: v.b,
            chapter: v.c,
            verse: v.v,
            translation: "KJV",
          })),
        });
      },
    }),
    {
      name: "scriptureflow-v1",
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        activeTranslation: state.activeTranslation,
      }),
    },
  ),
);
