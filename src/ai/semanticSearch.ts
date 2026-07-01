import { cosineSimilarity, computeCentroid } from "./similarity";
import type { EmbeddingRecord } from "./embeddingEngine";

export interface SemanticMatch extends EmbeddingRecord {
  score: number;
}

const BOOK_KEYWORDS: Record<string, string[]> = {
  Genesis: ["genesis", "creation", "adam", "abraham", "noah"],
  Exodus: ["exodus", "moses", "pharaoh", "egypt", "passover"],
  Leviticus: ["leviticus", "priest", "sacrifice", "law"],
  Numbers: ["numbers", "wilderness", "census"],
  Deuteronomy: ["deuteronomy", "law", "moses", "commandment"],
  Joshua: ["joshua", "jericho", "canaan"],
  Judges: ["judges", "samson", "gideon"],
  Ruth: ["ruth", "naomi", "boaz"],
  "1 Samuel": ["1 samuel", "saul", "david", "goliath"],
  "2 Samuel": ["2 samuel", "david", "absalom"],
  "1 Kings": ["1 kings", "solomon", "elijah", "temple"],
  "2 Kings": ["2 kings", "elisha", "hezekiah"],
  Psalms: ["psalm", "praise", "worship", "song"],
  Proverbs: ["proverb", "wisdom"],
  Isaiah: ["isaiah", "prophet", "judgment", "salvation"],
  Jeremiah: ["jeremiah", "prophet"],
  Ezekiel: ["ezekiel", "vision", "prophet"],
  Daniel: ["daniel", "lion", "dream", "vision"],
  Matthew: ["matthew", "jesus", "kingdom", "sermon", "parable"],
  Mark: ["mark", "jesus", "miracle"],
  Luke: ["luke", "jesus", "parable"],
  John: ["john", "jesus", "light", "love", "believe"],
  Acts: ["acts", "apostle", "peter", "paul", "holy spirit"],
  Romans: ["romans", "paul", "faith", "grace", "salvation"],
  "1 Corinthians": ["1 corinthians", "paul", "love", "spiritual"],
  "2 Corinthians": ["2 corinthians", "paul"],
  Galatians: ["galatians", "paul", "faith", "grace"],
  Ephesians: ["ephesians", "paul", "grace", "armor"],
  Philippians: ["philippians", "paul", "joy"],
  Colossians: ["colossians", "paul", "christ"],
  Hebrews: ["hebrews", "faith", "christ", "priest"],
  James: ["james", "faith", "works"],
  "1 Peter": ["1 peter", "suffering", "hope"],
  "2 Peter": ["2 peter", "false teacher"],
  "1 John": ["1 john", "love", "fellowship", "light"],
  Revelation: ["revelation", "apocalypse", "judgment", "lamb"],
};

function guessBook(query: string): string[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const bookScores = new Map<string, number>();
  for (const [book, keywords] of Object.entries(BOOK_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.split(/\s+/).length;
    }
    if (score > 0) bookScores.set(book, score);
  }
  return [...bookScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([book]) => book);
}

export class SemanticSearch {
  private embeddings: EmbeddingRecord[] = [];
  private bookCentroids: Map<string, Float32Array> = new Map();
  private embeddingsByBook: Map<string, EmbeddingRecord[]> = new Map();

  load(records: EmbeddingRecord[]): void {
    this.embeddings = records;
    this.buildIndex();
  }

  private buildIndex(): void {
    this.bookCentroids.clear();
    this.embeddingsByBook.clear();
    const bookVectors = new Map<string, Float32Array[]>();
    for (const verse of this.embeddings) {
      const book = verse.book || "";
      if (!bookVectors.has(book)) bookVectors.set(book, []);
      if (!this.embeddingsByBook.has(book)) this.embeddingsByBook.set(book, []);
      bookVectors.get(book)!.push(new Float32Array(verse.vector));
      this.embeddingsByBook.get(book)!.push(verse);
    }
    for (const [book, vectors] of bookVectors) {
      this.bookCentroids.set(book, computeCentroid(vectors));
    }
  }

  search(queryVec: Float32Array, topK = 5): SemanticMatch[] {
    if (this.embeddings.length === 0) return [];

    const guessed = guessBook("");
    let candidates: EmbeddingRecord[];

    if (this.bookCentroids.size > 0) {
      const bookScores = [...this.bookCentroids.entries()].map(([book, centroid]) => ({
        book,
        score: cosineSimilarity(queryVec, centroid),
      }));
      const topBooks = bookScores.sort((a, b) => b.score - a.score).slice(0, 2);

      candidates = [];
      for (const { book } of topBooks) {
        const verses = this.embeddingsByBook.get(book) || [];
        candidates.push(...verses);
      }
      if (candidates.length < 20) {
        const remaining = this.embeddings.filter(
          (v) => !topBooks.some((b) => b.book === v.book),
        );
        candidates.push(...remaining.slice(0, 100));
      }
    } else {
      candidates = this.embeddings;
    }

    const results = candidates.map((verse) => ({
      ...verse,
      score: cosineSimilarity(queryVec, verse.vector),
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  get isLoaded(): boolean {
    return this.embeddings.length > 0;
  }
}

export const semanticSearch = new SemanticSearch();
