import { parseScriptureReference, formatReference } from "../utils/scriptureParser";
import { replaceSpokenNumbers } from "./spokenNumbers";

export interface MatchResult {
  raw: string;
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  confidence: "high" | "medium" | "low";
}

export interface DetectionResult {
  matches: MatchResult[];
  context: string;
  prefix: string;
  suffix: string;
}

const VERSE_KEYWORDS = [
  "search",
  "find",
  "show",
  "look up",
  "read",
  "quote",
  "scripture",
  "bible",
  "verse",
  "chapter",
  "word of god",
  "turn to",
  "open to",
  "go to",
  "flip to",
];

export function extractScriptureFromText(text: string): DetectionResult {
  const normalized = replaceSpokenNumbers(text);
  const parsed = parseScriptureReference(normalized);

  const matches: MatchResult[] = parsed.map((r, i) => ({
    raw: r.raw,
    book: r.book,
    chapter: r.chapter,
    verse: r.verse || 1,
    verseEnd: r.verseEnd,
    confidence: r.verse ? (i === 0 ? "high" : "medium") : "medium",
  }));

  const lower = text.toLowerCase();
  const hasKeyword = VERSE_KEYWORDS.some((kw) => lower.includes(kw));

  if (matches.length > 0 && !hasKeyword) {
    matches.forEach((m) => {
      if (m.confidence === "high") m.confidence = "medium";
    });
  }

  const firstIdx =
    matches.length > 0
      ? Math.min(...matches.map((m) => text.indexOf(m.raw)).filter((i) => i >= 0))
      : -1;

  return {
    matches,
    context: text,
    prefix: firstIdx > 0 ? text.slice(0, firstIdx).trim() : "",
    suffix: firstIdx >= 0 ? text.slice(firstIdx + matches[0]?.raw.length).trim() : "",
  };
}

export function hasScriptureReference(text: string): boolean {
  return extractScriptureFromText(text).matches.length > 0;
}

export function formatMatch(match: MatchResult): string {
  return match.verseEnd
    ? `${match.book} ${match.chapter}:${match.verse}-${match.verseEnd}`
    : `${match.book} ${match.chapter}:${match.verse}`;
}
