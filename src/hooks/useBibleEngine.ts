import { useState, useEffect, useCallback, useRef } from "react";
import { BibleApiService } from "../services/bibleApi";
import type { TranslationMeta, ChapterResponse, BookInfo } from "../services/bibleApi";

const FALLBACK_BOOK_MAP: Record<string, string> = {
  Genesis: "GEN",
  Exodus: "EXO",
  Leviticus: "LEV",
  Numbers: "NUM",
  Deuteronomy: "DEU",
  Joshua: "JOS",
  Judges: "JDG",
  Ruth: "RUT",
  "1 Samuel": "1SA",
  "2 Samuel": "2SA",
  "1 Kings": "1KI",
  "2 Kings": "2KI",
  "1 Chronicles": "1CH",
  "2 Chronicles": "2CH",
  Ezra: "EZR",
  Nehemiah: "NEH",
  Esther: "EST",
  Job: "JOB",
  Psalms: "PSA",
  Proverbs: "PRO",
  Ecclesiastes: "ECC",
  "Song of Solomon": "SNG",
  Isaiah: "ISA",
  Jeremiah: "JER",
  Lamentations: "LAM",
  Ezekiel: "EZK",
  Daniel: "DAN",
  Hosea: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA",
  Jonah: "JON",
  Micah: "MIC",
  Nahum: "NAM",
  Habakkuk: "HAB",
  Zephaniah: "ZEP",
  Haggai: "HAG",
  Zechariah: "ZEC",
  Malachi: "MAL",
  Matthew: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Romans: "ROM",
  "1 Corinthians": "1CO",
  "2 Corinthians": "2CO",
  Galatians: "GAL",
  Ephesians: "EPH",
  Philippians: "PHP",
  Colossians: "COL",
  "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH",
  "1 Timothy": "1TI",
  "2 Timothy": "2TI",
  Titus: "TIT",
  Philemon: "PHM",
  Hebrews: "HEB",
  James: "JAS",
  "1 Peter": "1PE",
  "2 Peter": "2PE",
  "1 John": "1JN",
  "2 John": "2JN",
  "3 John": "3JN",
  Jude: "JUD",
  Revelation: "REV",
};

export const useBibleEngine = (initialTranslation = "BSB") => {
  const [translations, setTranslations] = useState<TranslationMeta[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<string>(initialTranslation);
  const [currentChapter, setCurrentChapter] = useState<ChapterResponse | null>(null);
  const [bookList, setBookList] = useState<BookInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const bookMapRef = useRef<Record<string, string>>(FALLBACK_BOOK_MAP);

  useEffect(() => {
    BibleApiService.getTranslations()
      .then((list) => setTranslations(list))
      .catch((err) => console.error("Error loading translations:", err));
  }, []);

  useEffect(() => {
    let cancelled = false;
    BibleApiService.getBooks(activeTranslation)
      .then((books) => {
        if (cancelled) return;
        setBookList(books);
        const map: Record<string, string> = { ...FALLBACK_BOOK_MAP };
        for (const b of books) {
          map[b.name] = b.id;
        }
        bookMapRef.current = map;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error loading books for", activeTranslation, err);
        bookMapRef.current = { ...FALLBACK_BOOK_MAP };
      });
    return () => {
      cancelled = true;
    };
  }, [activeTranslation]);

  const getBookCode = useCallback((bookName: string): string | undefined => {
    return bookMapRef.current[bookName];
  }, []);

  const loadPassage = async (
    book: string,
    chapter: number,
    translationCode = activeTranslation,
  ) => {
    setLoading(true);
    try {
      const data = await BibleApiService.getChapter(translationCode, book, chapter);
      setCurrentChapter(data);
    } catch (err) {
      console.error("Failed to parse scripture context:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    translations,
    activeTranslation,
    setActiveTranslation,
    currentChapter,
    loading,
    loadPassage,
    bookList,
    getBookCode,
  };
};
