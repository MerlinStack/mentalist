import { generateEmbedding } from "./embeddingEngine";
import { findBestMatch } from "./similarity";

let cachedEmbeddings = null;

export async function loadVerseEmbeddings() {
  if (cachedEmbeddings) return cachedEmbeddings;
  const res = await fetch("/bible/embeddings.json");
  if (!res.ok) throw new Error("Failed to load embeddings.json");
  cachedEmbeddings = await res.json();
  return cachedEmbeddings;
}

export async function semanticSearch(transcript) {
  const [transcriptEmbedding, verseEmbeddings] = await Promise.all([
    generateEmbedding(transcript),
    loadVerseEmbeddings(),
  ]);
  return findBestMatch(transcriptEmbedding, verseEmbeddings, 3);
}
