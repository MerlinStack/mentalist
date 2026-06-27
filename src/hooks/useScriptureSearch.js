import { useCallback, useEffect, useRef } from "react";
import { useScriptureStore } from "../store/scriptureStore";
import { parseScriptureReference } from "../utils/scriptureParser";
import { fetchMultipleVerses, searchByKeyword } from "../api/bible";
import { getApiCode } from "../data/versions";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "his",
  "her",
  "their",
  "our",
  "your",
  "my",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "so",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "he",
  "she",
  "they",
  "we",
  "i",
  "not",
  "no",
  "nor",
  "as",
  "if",
  "then",
  "than",
  "when",
  "who",
  "which",
  "what",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "from",
  "by",
  "about",
  "against",
  "between",
  "into",
  "through",
  "god",
  "lord",
  "said",
  "unto",
  "thee",
  "thou",
  "thy",
  "ye",
  "him",
  "them",
  "us",
  "me",
  "mine",
  "thine",
]);

function extractKeywords(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .sort((a, b) => b.length - a.length);
}

export function useScriptureSearch() {
  const store = useScriptureStore();
  const debounceRef = useRef(null);

  const search = useCallback(
    async (q) => {
      const query = q || store.query;
      if (!query.trim()) return;

      store.setQuery(query);
      store.setSearching(true);
      store.setSearchError(null);

      const translation = getApiCode(store.activeTranslation);
      const mode = store.searchMode;

      try {
        // ── REFERENCE MODE ──────────────────────────────────────────
        if (mode === "Reference") {
          const parsed = parseScriptureReference(query);
          if (parsed.length > 0) {
            const refStrings = parsed.map((r) =>
              r.verseEnd
                ? `${r.book} ${r.chapter}:${r.verse}-${r.verseEnd}`
                : r.verse
                  ? `${r.book} ${r.chapter}:${r.verse}`
                  : `${r.book} ${r.chapter}`,
            );
            const verses = await fetchMultipleVerses(refStrings, translation);
            if (verses.length > 0) {
              store.setResults(verses);
              store.addToHistory(query);
              store.setSearching(false);
              return;
            }
          }
          store.setResults([]);
          store.setSearchError("Reference not found. Check the book name and chapter.");
          store.setSearching(false);
          return;
        }

        // ── THEME MODE ───────────────────────────────────────────────
        if (mode === "Theme") {
          const keywords = extractKeywords(query);
          if (keywords.length > 0) {
            const verses = await searchByKeyword(keywords[0], translation);
            if (verses.length > 0) {
              store.setResults(verses.slice(0, 15));
              store.addToHistory(query);
              store.setSearching(false);
              return;
            }
          }
          store.setResults([]);
          store.setSearchError(
            'No verses found for that theme. Try a single word like "faith" or "forgiveness".',
          );
          store.setSearching(false);
          return;
        }

        // ── QUOTE MODE ───────────────────────────────────────────────
        if (mode === "Quote") {
          const parsed = parseScriptureReference(query);
          if (parsed.length > 0) {
            const refStrings = parsed.map((r) =>
              r.verseEnd
                ? `${r.book} ${r.chapter}:${r.verse}-${r.verseEnd}`
                : r.verse
                  ? `${r.book} ${r.chapter}:${r.verse}`
                  : `${r.book} ${r.chapter}`,
            );
            const verses = await fetchMultipleVerses(refStrings, translation);
            if (verses.length > 0) {
              store.setResults(verses);
              store.addToHistory(query);
              store.setSearching(false);
              return;
            }
          }

          const keywords = extractKeywords(query);
          if (keywords.length > 0) {
            for (const kw of keywords.slice(0, 2)) {
              const verses = await searchByKeyword(kw, translation);
              if (verses.length > 0) {
                const otherKeywords = keywords.filter((k) => k !== kw);
                const filtered =
                  otherKeywords.length > 0
                    ? verses.filter((v) =>
                        otherKeywords.some((ok) => v.text.toLowerCase().includes(ok)),
                      )
                    : verses;

                const finalResults = filtered.length > 0 ? filtered : verses;
                store.setResults(finalResults.slice(0, 15));
                store.addToHistory(query);
                store.setSearching(false);
                return;
              }
            }
          }

          store.setResults([]);
          store.setSearchError(
            'No verses found. Try using key words like "loved", "shepherd", or "faith".',
          );
          store.setSearching(false);
          return;
        }
      } catch (err) {
        console.error("Search error:", err);
        store.setSearchError("Search failed. Check your connection.");
        store.setSearching(false);
      }
    },
    [store],
  );

  const debouncedSearch = useCallback(
    (q) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 300);
    },
    [search],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    query: store.query,
    setQuery: store.setQuery,
    results: store.results,
    activeVerse: store.activeVerse,
    setActiveVerse: store.setActiveVerse,
    searchMode: store.searchMode,
    setSearchMode: store.setSearchMode,
    isSearching: store.isSearching,
    searchError: store.searchError,
    search: debouncedSearch,
    searchImmediate: search,
    searchHistory: store.searchHistory,
    clearResults: store.clearResults,
    loadChapter: store.loadChapter,
  };
}
