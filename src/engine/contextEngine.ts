import { extractScriptureFromText, type MatchResult } from "./regexEngine";
import { parseSpokenNumber } from "./spokenNumbers";

interface ContextState {
  lastBook: string | null;
  lastChapter: number | null;
  lastVerse: number | null;
  consecutiveDetections: number;
  recentChunks: string[];
}

const state: ContextState = {
  lastBook: null,
  lastChapter: null,
  lastVerse: null,
  consecutiveDetections: 0,
  recentChunks: [],
};

export function resetContext() {
  state.lastBook = null;
  state.lastChapter = null;
  state.lastVerse = null;
  state.consecutiveDetections = 0;
  state.recentChunks = [];
}

export function analyzeWithContext(chunk: string): {
  explicit: MatchResult[];
  implicit: MatchResult[];
} {
  state.recentChunks.push(chunk);
  if (state.recentChunks.length > 10) state.recentChunks.shift();

  const { matches } = extractScriptureFromText(chunk);
  const explicit = matches;

  if (explicit.length > 0) {
    const last = explicit[explicit.length - 1];
    state.lastBook = last.book;
    state.lastChapter = last.chapter;
    state.lastVerse = last.verse;
    state.consecutiveDetections++;
  } else {
    state.consecutiveDetections = 0;
  }

  const implicit: MatchResult[] = [];
  const lower = chunk.toLowerCase().trim();

  if (state.lastBook && state.consecutiveDetections < 3) {
    const verseMatch = lower.match(/(?:verse|verses)\s+(\d+)(?:\s*(?:through|to|-|–)\s*(\d+))?/i);
    if (verseMatch) {
      const verseNum = parseInt(verseMatch[1]);
      const verseEnd = verseMatch[2] ? parseInt(verseMatch[2]) : undefined;
      implicit.push({
        raw: verseMatch[0],
        book: state.lastBook,
        chapter: state.lastChapter || 1,
        verse: verseNum,
        verseEnd,
        confidence: "medium",
      });
    }

    const chapterMatch = lower.match(/(?:chapter|ch)\s+(\d+)(?:\s*[,.]?\s*verse\s+(\d+))?/i);
    if (chapterMatch && !verseMatch) {
      implicit.push({
        raw: chapterMatch[0],
        book: state.lastBook,
        chapter: parseInt(chapterMatch[1]),
        verse: chapterMatch[2] ? parseInt(chapterMatch[2]) : state.lastVerse || 1,
        confidence: "medium",
      });
    }

    const plainNum = lower.match(/^(?:is\s+it\s+)?(\d+)\s*[:.]?\s*(\d+)?$/);
    if (plainNum && state.lastBook) {
      implicit.push({
        raw: plainNum[0],
        book: state.lastBook,
        chapter: parseInt(plainNum[1]),
        verse: plainNum[2] ? parseInt(plainNum[2]) : state.lastVerse || 1,
        confidence: "low",
      });
    }
  }

  const spokenNum = parseSpokenNumber(lower);
  if (spokenNum && state.lastBook && state.lastChapter && implicit.length === 0) {
    implicit.push({
      raw: lower,
      book: state.lastBook,
      chapter: state.lastChapter,
      verse: spokenNum,
      confidence: "low",
    });
  }

  return { explicit, implicit };
}

export function getContextSummary(): { book: string | null; chapter: number | null } {
  return { book: state.lastBook, chapter: state.lastChapter };
}
