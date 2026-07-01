export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleEmbedding {
  book: string;
  chapter: number;
  verse: number;
  vector: number[];
}

export async function loadVerses(): Promise<BibleVerse[]> {
  const res = await fetch("/bible/verses.json");
  if (!res.ok) throw new Error("verses.json not found — run npm run generate-embeddings");
  return res.json();
}

export async function loadEmbeddings(): Promise<BibleEmbedding[]> {
  const res = await fetch("/bible/embeddings.json");
  if (!res.ok) throw new Error("embeddings.json not found — run npm run generate-embeddings");
  return res.json();
}
