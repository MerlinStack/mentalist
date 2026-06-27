const CF_AI_GATEWAY = "https://gateway.ai.cloudflare.com/v1";

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

export async function transcribeViaCloudflare(
  audioBlob: Blob,
  model = "@cf/openai/whisper-tiny-en",
): Promise<string> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured. Set accountId, gatewayName, and apiKey.");
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");
  formData.append("model", model);

  const url = `${CF_AI_GATEWAY}/${config.accountId}/${config.gatewayName}/workers-ai/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Cloudflare AI error: ${res.status}`);

  const data = await res.json();
  return (data as { text?: string }).text || "";
}

export async function searchViaCloudflare(
  query: string,
  embeddings: number[][],
  model = "@cf/intfloat/multilingual-e5-small",
): Promise<{ index: number; score: number }[]> {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare AI not configured");
  }

  const url = `${CF_AI_GATEWAY}/${config.accountId}/${config.gatewayName}/workers-ai/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [query, ...embeddings.map(() => "")],
    }),
  });

  if (!res.ok) throw new Error(`Cloudflare AI search error: ${res.status}`);
  const data = await res.json();
  return (data as { shape: number[]; data: number[][] }).data.map((vec, i) => ({
    index: i,
    score: 0,
  }));
}
