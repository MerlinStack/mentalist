const BASE_URL = "/api/bible";

export interface Verse {
  reference: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
  translation?: string;
  ref?: string;
  relevance?: number;
}

export interface VerseResult extends Verse {
  score?: number;
}

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

function normaliseVerse(data: any, translation: string): Verse {
  return {
    reference: data.reference || "",
    text: data.text || data.verses?.[0]?.text || "",
    book: data.verses?.[0]?.book_name || "",
    chapter: data.verses?.[0]?.chapter || 0,
    verse: data.verses?.[0]?.verse || 0,
    translation,
  };
}

export async function fetchVerse(reference: string, translation = "kjv"): Promise<Verse> {
  const encoded = encodeURIComponent(reference);
  const res = await fetch(`${BASE_URL}/${encoded}?translation=${translation}`);
  if (!res.ok) throw new Error(`Verse not found: ${reference}`);
  const data = await res.json();
  return normaliseVerse(data, translation);
}

export async function fetchMultipleVerses(
  references: string[],
  translation = "kjv",
): Promise<Verse[]> {
  return Promise.all(references.map((ref) => fetchVerse(ref, translation)));
}

export async function searchByKeyword(query: string, translation = "kjv"): Promise<Verse[]> {
  if (!query?.trim()) return [];

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const searchTerm = words.sort((a, b) => b.length - a.length)[0] || query;

  const res = await fetch(
    `${BASE_URL}/?search=${encodeURIComponent(searchTerm)}&translation=${translation}`,
  );
  if (!res.ok) return [];

  const data = await res.json();

  if (!data.verses?.length) return [];

  return data.verses.slice(0, 20).map((v: any) => ({
    reference: `${v.book_name} ${v.chapter}:${v.verse}`,
    text: v.text,
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    translation,
    relevance: v.relevance || 0,
  }));
}

export async function getChapter(
  book: string,
  chapter: number,
  translation = "kjv",
): Promise<Verse[]> {
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(book)}+${chapter}?translation=${translation}`,
  );
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.verses?.length) return [];

  return data.verses.map((v: any) => ({
    reference: `${v.book_name} ${v.chapter}:${v.verse}`,
    text: v.text,
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    translation,
  }));
}
