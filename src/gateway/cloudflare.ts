export type WorkersAIModel =
  | "@cf/openai/whisper-tiny-en"
  | "@cf/deepgram-ai/flux"
  | "@cf/deepgram-ai/aura"
  | "@cf/google/gemma-2-2b-it"
  | "@cf/google/gemma-2-9b-it"
  | "@cf/intfloat/multilingual-e5-small";

const CF_AI_GATEWAY = "https://gateway.ai.cloudflare.com/v1";
const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface GatewayConfig {
  accountId?: string;
  gatewayName?: string;
  apiKey?: string;
}

let config: GatewayConfig = {};

export function configureCloudflareAI(cfg: GatewayConfig) {
  config = cfg;
}

export function isCloudflareConfigured(): boolean {
  return !!(config.accountId && config.gatewayName && config.apiKey);
}

function gatewayUrl(model: string): string {
  return `${CF_AI_GATEWAY}/${config.accountId}/${config.gatewayName}/workers-ai/${model}`;
}

// ─── STT: Whisper ──────────────────────────────────────────────

export async function transcribeViaCloudflare(
  audioBlob: Blob,
  model: WorkersAIModel = "@cf/openai/whisper-tiny-en",
): Promise<string> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured. Set accountId, gatewayName, and apiKey.");
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");
  formData.append("model", model);

  const res = await fetch(gatewayUrl(model), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Cloudflare AI STT error: ${res.status}`);
  const data = await res.json();
  return (data as { text?: string }).text || "";
}

// ─── STT: Deepgram Flux ────────────────────────────────────────

export async function transcribeDeepgramFlux(audioBlob: Blob): Promise<string> {
  return transcribeViaCloudflare(audioBlob, "@cf/deepgram-ai/flux");
}

// ─── TTS: Deepgram Aura ────────────────────────────────────────

export async function synthesizeViaCloudflare(
  text: string,
  model: WorkersAIModel = "@cf/deepgram-ai/aura",
): Promise<Blob> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured");
  }

  const res = await fetch(gatewayUrl(model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`Cloudflare AI TTS error: ${res.status}`);
  return res.blob();
}

// ─── LLM: Gemma ────────────────────────────────────────────────

export interface GemmaOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: WorkersAIModel;
}

export async function askGemma(prompt: string, options: GemmaOptions = {}): Promise<string> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured");
  }

  const model = options.model ?? "@cf/google/gemma-2-2b-it";
  const messages: { role: string; content: string }[] = [];

  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  const body: Record<string, unknown> = {
    messages,
    stream: false,
  };
  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  const res = await fetch(gatewayUrl(model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Cloudflare AI LLM error: ${res.status}`);
  const data = await res.json();
  return (data as { response?: string }).response || "";
}

// ─── Utilities ─────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchViaCloudflare(
  query: string,
  embeddings: number[][],
  model: WorkersAIModel = "@cf/intfloat/multilingual-e5-small",
): Promise<{ index: number; score: number }[]> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured");
  }

  if (embeddings.length === 0) return [];

  const res = await fetch(gatewayUrl(model), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [query] }),
  });

  if (!res.ok) throw new Error(`Cloudflare AI search error: ${res.status}`);
  const data = (await res.json()) as { shape: number[]; data: number[][] };
  const vectors = data.data;
  if (!vectors || vectors.length === 0) return [];

  const queryVec = vectors[0];
  return embeddings.map((vec, i) => ({
    index: i,
    score: cosineSimilarity(queryVec, vec),
  }));
}
