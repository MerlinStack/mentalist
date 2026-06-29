import { pipeline } from "@huggingface/transformers";

let extractor: any = null;
let embeddings: any[] = [];
let bookCentroids: Map<string, Float32Array> = new Map();
let embeddingsByBook: Map<string, any[]> = new Map();

function cosineSimilarity(a: Float32Array, b: number[] | Float32Array): number {
  const bFloat = b instanceof Float32Array ? b : new Float32Array(b);
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * bFloat[i];
    normA += a[i] * a[i];
    normB += bFloat[i] * bFloat[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function computeCentroid(vectors: Float32Array[]): Float32Array {
  if (vectors.length === 0) return new Float32Array(384);
  const dim = vectors[0].length;
  const centroid = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }
  const invN = 1 / vectors.length;
  for (let i = 0; i < dim; i++) centroid[i] *= invN;
  return centroid;
}

function buildBookIndex(emb: any[]): void {
  bookCentroids.clear();
  embeddingsByBook.clear();
  const bookVectors = new Map<string, Float32Array[]>();
  for (const verse of emb) {
    const book = verse.book || "";
    if (!bookVectors.has(book)) bookVectors.set(book, []);
    if (!embeddingsByBook.has(book)) embeddingsByBook.set(book, []);
    bookVectors.get(book)!.push(new Float32Array(verse.vector));
    embeddingsByBook.get(book)!.push(verse);
  }
  for (const [book, vectors] of bookVectors) {
    bookCentroids.set(book, computeCentroid(vectors));
  }
}

const BOOK_KEYWORDS: Record<string, string[]> = {
  Genesis: ["genesis", "beginning", "creation", "adam", "abraham", "isaac", "jacob", "noah"],
  Exodus: [
    "exodus",
    "moses",
    "pharaoh",
    "egypt",
    "passover",
    "plague",
    "red sea",
    "ten commandment",
  ],
  Leviticus: ["leviticus", "priest", "sacrifice", "holy", "offering", "law"],
  Numbers: ["numbers", "wilderness", "census", "israelites", "tabernacle"],
  Deuteronomy: ["deuteronomy", "law", "moses", "commandment", "covenant"],
  Joshua: ["joshua", "jericho", "canaan", "promised land"],
  Judges: ["judges", "samson", "gideon", "israel"],
  Ruth: ["ruth", "naomi", "boaz"],
  Samuel: ["samuel", "saul", "david", "goliath"],
  Kings: ["kings", "solomon", "temple", "elijah", "elisha"],
  Chronicles: ["chronicles", "david", "temple", "genealogy"],
  Ezra: ["ezra", "nehemiah", "jerusalem", "temple"],
  Esther: ["esther", "mordecai", "haman", "purim"],
  Job: ["job", "suffering", "satan", "comfort"],
  Psalms: ["psalm", "praise", "worship", "lord", "song", "sing"],
  Proverbs: ["proverb", "wisdom", "folly", "wise", "fool"],
  Ecclesiastes: ["ecclesiastes", "vanity", "meaningless", "wisdom"],
  Song: ["song", "solomon", "love", "bride"],
  Isaiah: ["isaiah", "prophet", "judgment", "salvation", "messiah"],
  Jeremiah: ["jeremiah", "prophet", "judgment", "weeping"],
  Lamentations: ["lamentations", "weeping", "jerusalem"],
  Ezekiel: ["ezekiel", "vision", "prophet", "valley", "dry bones"],
  Daniel: ["daniel", "lion", "dream", "vision", "prophecy"],
  Hosea: ["hosea", "prophet", "unfaithful"],
  Joel: ["joel", "locust", "prophet"],
  Amos: ["amos", "prophet", "justice"],
  Jonah: ["jonah", "whale", "nineveh", "prophet"],
  Micah: ["micah", "prophet", "judgment"],
  Nahum: ["nahum", "nineveh"],
  Habakkuk: ["habakkuk", "prophet"],
  Zephaniah: ["zephaniah", "prophet"],
  Haggai: ["haggai", "temple"],
  Zechariah: ["zechariah", "prophet", "vision"],
  Malachi: ["malachi", "prophet", "tithe"],
  Matthew: ["matthew", "jesus", "christ", "kingdom", "heaven", "sermon", "beatitude", "parable"],
  Mark: ["mark", "jesus", "gospel", "miracle"],
  Luke: ["luke", "jesus", "gospel", "parable", "birth"],
  John: ["john", "jesus", "gospel", "light", "word", "love", "believe", "fellowship"],
  Acts: ["acts", "apostle", "peter", "paul", "holy spirit", "church"],
  Romans: ["romans", "paul", "faith", "grace", "sin", "salvation", "righteousness"],
  Corinthians: ["corinthians", "paul", "church", "love", "spiritual", "gift"],
  Galatians: ["galatians", "paul", "faith", "grace", "law", "freedom"],
  Ephesians: ["ephesians", "paul", "grace", "armor", "church"],
  Philippians: ["philippians", "paul", "joy", "rejoice"],
  Colossians: ["colossians", "paul", "christ", "supremacy"],
  Thessalonians: ["thessalonians", "paul", "return", "end times"],
  Timothy: ["timothy", "paul", "leadership", "church"],
  Titus: ["titus", "paul", "leadership"],
  Philemon: ["philemon", "paul"],
  Hebrews: ["hebrews", "faith", "christ", "priest", "covenant", "sacrifice"],
  James: ["james", "faith", "works", "wisdom"],
  Peter: ["peter", "suffering", "hope", "grace"],
  Jude: ["jude", "contend", "faith"],
  Revelation: [
    "revelation",
    "apocalypse",
    "end",
    "judgment",
    "lamb",
    "new jerusalem",
    "scroll",
    "seal",
  ],
};

function guessBook(query: string): string[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);
  const bookScores = new Map<string, number>();
  for (const [book, keywords] of Object.entries(BOOK_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.split(/\s+/).length;
    }
    for (const w of words) {
      if (keywords.some((kw) => kw.includes(w) || w.includes(kw))) score += 0.5;
    }
    if (score > 0) bookScores.set(book, score);
  }
  return [...bookScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([book]) => book);
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "load") {
    try {
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        progress_callback: (progress: any) => {
          self.postMessage({
            type: "progress",
            status: progress.status,
            loaded: progress.loaded,
            total: progress.total,
          });
        },
      });
      self.postMessage({ type: "loaded" });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }

  if (type === "loadEmbeddings") {
    const emb = payload.embeddings || payload || [];
    embeddings = emb;
    buildBookIndex(emb);
    self.postMessage({ type: "embeddingsLoaded" });
  }

  if (type === "search") {
    if (!extractor) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }
    try {
      const queryEmbedding = await extractor(payload, { pooling: "mean", normalize: true });
      const queryVec = queryEmbedding.data;

      const guessedBooks = guessBook(payload);
      let candidates: any[];

      if (guessedBooks.length > 0 && bookCentroids.size > 0) {
        const bookScores = guessedBooks.map((book) => ({
          book,
          score: cosineSimilarity(queryVec, bookCentroids.get(book) || new Float32Array(384)),
        }));
        const topBooks = bookScores.sort((a, b) => b.score - a.score).slice(0, 2);

        candidates = [];
        for (const { book } of topBooks) {
          const verses = embeddingsByBook.get(book) || [];
          if (verses.length > 0) {
            candidates.push(...verses);
          }
        }

        if (candidates.length < 20) {
          const remaining = embeddings.filter((v: any) => !topBooks.some((b) => b.book === v.book));
          candidates.push(...remaining.slice(0, 100));
        }
      } else {
        candidates = embeddings;
      }

      const results = candidates.map((verse: any) => ({
        ...verse,
        score: cosineSimilarity(queryVec, verse.vector),
      }));

      const topResults = results.sort((a: any, b: any) => b.score - a.score).slice(0, 5);
      self.postMessage({ type: "results", matches: topResults });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }
};

self.postMessage({ type: "ready" });
