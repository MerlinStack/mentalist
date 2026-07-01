export function cosineSimilarity(a: Float32Array, b: number[] | Float32Array): number {
  const bArr = b instanceof Float32Array ? b : new Float32Array(b);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * bArr[i];
    normA += a[i] * a[i];
    normB += bArr[i] * bArr[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function computeCentroid(vectors: Float32Array[]): Float32Array {
  if (vectors.length === 0) return new Float32Array(384);
  const dim = vectors[0].length;
  const centroid = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) centroid[i] += v[i];
  }
  const invN = 1 / vectors.length;
  for (let i = 0; i < dim; i++) centroid[i] *= invN;
  return centroid;
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
