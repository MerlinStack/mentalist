import type { Verse } from "../api/bible";

export interface TranslationMeta {
  id: string;
  name: string;
  englishName: string;
  shortName: string;
  language: string;
}

export interface BookInfo {
  id: string;
  name: string;
}

export interface VerseContent {
  type: string;
  text?: string;
  verse?: number;
}

export interface ChapterResponse {
  translation: string;
  book: string;
  chapter: number;
  verses: {
    number: number;
    content: VerseContent[];
  }[];
}

const BASE_URL = "https://bible.helloao.org/api";

export function normalizeAoBookName(name: string): string {
  const map: Record<string, string> = {
    "song of solomon": "Song of Solomon",
    "song of songs": "Song of Solomon",
    song: "Song of Solomon",
    psalms: "Psalms",
    psalm: "Psalms",
  };
  const lower = name.toLowerCase().trim();
  return map[lower] || name;
}

export function aoChapterToVerses(chapter: ChapterResponse, bookName: string): Verse[] {
  return chapter.verses.map((v) => ({
    reference: `${bookName} ${chapter.chapter}:${v.number}`,
    ref: `${bookName} ${chapter.chapter}:${v.number}`,
    text: v.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join(" "),
    book: bookName,
    chapter: chapter.chapter,
    verse: v.number,
    translation: chapter.translation,
  }));
}

export const BibleApiService = {
  getTranslations: async (): Promise<TranslationMeta[]> => {
    const res = await fetch(`${BASE_URL}/available_translations.json`);
    const data = await res.json();
    return data.translations;
  },

  getBooks: async (translation: string): Promise<BookInfo[]> => {
    const res = await fetch(`${BASE_URL}/${translation}/books.json`);
    if (!res.ok) throw new Error("Failed to fetch books");
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.books ?? []);
    return list.map((b: BookInfo) => ({
      id: b.id,
      name: normalizeAoBookName(b.name),
    }));
  },

  getChapter: async (
    translation: string,
    book: string,
    chapter: number,
  ): Promise<ChapterResponse> => {
    const res = await fetch(`${BASE_URL}/${translation}/${book}/${chapter}.json`);
    if (!res.ok) throw new Error("Scripture lookup failed");
    return res.json();
  },
};
