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

const STOPWORDS = new Set([
  "the",
  "and",
  "that",
  "for",
  "which",
  "with",
  "have",
  "this",
  "will",
  "they",
  "from",
  "their",
  "there",
  "them",
  "shall",
  "unto",
  "upon",
  "when",
  "were",
  "been",
  "said",
  "lord",
  "god",
  "into",
  "also",
  "his",
  "her",
  "our",
  "you",
  "not",
  "all",
  "are",
  "but",
  "was",
  "thy",
  "thou",
  "thee",
  "your",
  "its",
  "has",
  "had",
  "who",
  "what",
  "why",
  "how",
  "where",
  "these",
  "those",
  "then",
  "than",
  "some",
  "any",
  "out",
  "may",
  "come",
  "made",
  "make",
  "king",
  "man",
  "day",
  "way",
  "went",
  "came",
  "even",
  "yet",
  "now",
]);

export class ScriptureLookupEngine {
  private verses: BibleVerseRecord[] = [];
  private index: Map<string, number[]> = new Map();
  private verseTokenCache: string[][] = [];
  private verseTokenSets: Set<string>[] = [];
  private refIndex: Map<string, number> = new Map();
  private idfCache: Map<string, number> = new Map();
  private totalVerses = 0;

  public loadDatabase(bibleData: BibleVerseRecord[]): void {
    this.verses = bibleData;
    this.totalVerses = this.verses.length;
    this.index.clear();
    this.verseTokenCache = new Array(this.totalVerses);
    this.verseTokenSets = new Array(this.totalVerses);
    this.refIndex.clear();
    this.idfCache.clear();

    for (let i = 0; i < this.totalVerses; i++) {
      const v = this.verses[i];
      const tokens = this.tokenize(v.t);
      this.verseTokenCache[i] = tokens;
      this.verseTokenSets[i] = new Set(tokens);

      const tokenSet = new Set<string>();
      for (const token of tokens) {
        tokenSet.add(token);
        if (!this.index.has(token)) {
          this.index.set(token, []);
        }
        this.index.get(token)!.push(i);
      }

      const key = `${v.b.toLowerCase()}|${v.c}|${v.v}`;
      this.refIndex.set(key, i);
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  private getTokenWeight(token: string): number {
    let cached = this.idfCache.get(token);
    if (cached !== undefined) return cached;
    const matching = this.index.get(token);
    const df = matching ? matching.length : 1;
    const idf = 1 + Math.log((this.totalVerses + 1) / (df + 1));
    cached = idf / Math.log(this.totalVerses + 1);
    this.idfCache.set(token, cached);
    return cached;
  }

  private getNgrams(tokens: string[]): Set<string> {
    const ngrams = new Set<string>(tokens);
    for (let i = 0; i < tokens.length - 1; i++) {
      ngrams.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return ngrams;
  }

  public reverseLookup(transcript: string, matchThreshold = 75): LookupMatchResult | null {
    const results = this.reverseLookupTopN(transcript, matchThreshold, 1);
    return results.length > 0 ? results[0] : null;
  }

  public getVerse(book: string, chapter: number, verse: number): BibleVerseRecord | null {
    const key = `${book.toLowerCase()}|${chapter}|${verse}`;
    const idx = this.refIndex.get(key);
    return idx !== undefined ? this.verses[idx] : null;
  }

  public getChapter(book: string, chapter: number): BibleVerseRecord[] {
    const prefix = `${book.toLowerCase()}|${chapter}|`;
    const results: BibleVerseRecord[] = [];
    for (const [key, idx] of this.refIndex) {
      if (key.startsWith(prefix)) {
        results.push(this.verses[idx]);
      }
    }
    return results;
  }

  public getVerseByRef(ref: string): BibleVerseRecord | null {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return null;
    const [, book, ch, vs] = match;
    return this.getVerse(book, parseInt(ch), parseInt(vs));
  }

  public getVerseText(book: string, chapter: number, verse: number): string | null {
    const v = this.getVerse(book, chapter, verse);
    return v ? v.t : null;
  }

  public reverseLookupTopN(transcript: string, matchThreshold = 75, topN = 5): LookupMatchResult[] {
    if (!transcript || transcript.trim().length < 4 || this.totalVerses === 0) {
      return [];
    }

    const rawTokens = this.tokenize(transcript);
    const queryTokens = rawTokens.filter((t) => !STOPWORDS.has(t));
    const allTokens = queryTokens.length > 0 ? queryTokens : rawTokens;
    if (allTokens.length === 0) return [];

    const queryNgrams = this.getNgrams(allTokens);
    const scores = new Map<number, number>();
    const tokenMatches = new Map<number, Set<string>>();

    for (const token of allTokens) {
      const matchingIndices = this.index.get(token);
      if (!matchingIndices) continue;
      const weight = this.getTokenWeight(token);
      for (const idx of matchingIndices) {
        const current = scores.get(idx) || 0;
        scores.set(idx, current + weight);
        if (!tokenMatches.has(idx)) tokenMatches.set(idx, new Set());
        tokenMatches.get(idx)!.add(token);
      }
    }

    if (scores.size === 0) return [];

    const maxPossibleScore = allTokens.reduce((sum, t) => sum + this.getTokenWeight(t), 0);
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN * 5);

    const results: LookupMatchResult[] = [];

    for (const [idx, rawScore] of sorted) {
      const matchedVerse = this.verses[idx];
      const targetTokens = this.verseTokenSets[idx];

      const matchedTokens = queryNgrams;
      const uniqueMatches = [...matchedTokens].filter(
        (t) => targetTokens.has(t) || (t.includes(" ") && targetTokens.has(t)),
      ).length;

      const ngramBonus = uniqueMatches / Math.max(queryNgrams.size, 1);
      const normalizedScore = rawScore / Math.max(maxPossibleScore, 0.001);
      const combinedScore = normalizedScore * 0.7 + ngramBonus * 0.3;
      const confidence = Math.round(combinedScore * 100);

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
