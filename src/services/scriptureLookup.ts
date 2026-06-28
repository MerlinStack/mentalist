export interface BibleVerseRecord {
  b: string;
  c: number;
  v: number;
  t: string;
}

export interface LookupMatchResult {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  confidence: number;
  stage: "semantic" | "regex";
}

export class ScriptureLookupEngine {
  private verses: BibleVerseRecord[] = [];
  private index: Map<string, number[]> = new Map();

  public loadDatabase(bibleData: BibleVerseRecord[]): void {
    this.verses = bibleData;
    this.index.clear();

    for (let i = 0; i < this.verses.length; i++) {
      const tokens = this.tokenize(this.verses[i].t);
      for (const token of tokens) {
        if (!this.index.has(token)) {
          this.index.set(token, []);
        }
        this.index.get(token)!.push(i);
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  public reverseLookup(transcript: string, matchThreshold = 75): LookupMatchResult | null {
    const results = this.reverseLookupTopN(transcript, matchThreshold, 1);
    return results.length > 0 ? results[0] : null;
  }

  public getVerse(book: string, chapter: number, verse: number): BibleVerseRecord | null {
    for (const v of this.verses) {
      if (v.b.toLowerCase() === book.toLowerCase() && v.c === chapter && v.v === verse) {
        return v;
      }
    }
    return null;
  }

  public getChapter(book: string, chapter: number): BibleVerseRecord[] {
    return this.verses.filter(
      (v) => v.b.toLowerCase() === book.toLowerCase() && v.c === chapter,
    );
  }

  public getVerseByRef(ref: string): BibleVerseRecord | null {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return null;
    const [, book, ch, vs] = match;
    return this.getVerse(book, parseInt(ch), parseInt(vs));
  }

  public getVerseText(book: string, chapter: number, verse: number): string | null {
    for (const v of this.verses) {
      if (v.b.toLowerCase() === book.toLowerCase() && v.c === chapter && v.v === verse) {
        return v.t;
      }
    }
    return null;
  }

  public reverseLookupTopN(transcript: string, matchThreshold = 75, topN = 5): LookupMatchResult[] {
    if (!transcript || transcript.trim().length < 8 || this.verses.length === 0) {
      return [];
    }

    const queryTokens = this.tokenize(transcript);
    if (queryTokens.length === 0) return [];

    const scores = new Map<number, number>();

    for (const token of queryTokens) {
      const matchingIndices = this.index.get(token);
      if (matchingIndices) {
        for (const idx of matchingIndices) {
          scores.set(idx, (scores.get(idx) || 0) + 1);
        }
      }
    }

    if (scores.size === 0) return [];

    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN * 3);

    const results: LookupMatchResult[] = [];

    for (const [idx, hits] of sorted) {
      const matchedVerse = this.verses[idx];
      const targetTokens = this.tokenize(matchedVerse.t);
      const uniqueMatches = queryTokens.filter(t => targetTokens.includes(t)).length;
      const confidence = Math.round((uniqueMatches / Math.max(queryTokens.length, 3)) * 100);

      if (confidence < matchThreshold) continue;

      const referenceStr = `${matchedVerse.b} ${matchedVerse.c}:${matchedVerse.v}`;

      results.push({
        ref: referenceStr,
        book: matchedVerse.b,
        chapter: matchedVerse.c,
        verse: matchedVerse.v,
        text: matchedVerse.t,
        confidence: Math.min(confidence, 100),
        stage: "semantic",
      });

      if (results.length >= topN) break;
    }

    return results;
  }
}

export const lookupEngine = new ScriptureLookupEngine();
