interface LovableGatewayConfig {
  endpoint?: string;
  apiKey?: string;
}

let config: LovableGatewayConfig = {};

export function configureLovableGateway(cfg: LovableGatewayConfig) {
  config = cfg;
}

export function isLovableGatewayConfigured(): boolean {
  return !!(config.endpoint && config.apiKey);
}

export async function transcribeViaLovable(
  audioBlob: Blob,
  options?: { model?: string; language?: string },
): Promise<string> {
  if (!isLovableGatewayConfigured()) {
    throw new Error("Lovable AI Gateway not configured. Set endpoint and apiKey.");
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");
  if (options?.model) formData.append("model", options.model);
  if (options?.language) formData.append("language", options.language);

  const res = await fetch(`${config.endpoint}/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Lovable Gateway error: ${res.status}`);
  const data = await res.json();
  return (data as { text?: string }).text || "";
}

export async function detectViaLovable(
  text: string,
): Promise<{ reference: string; confidence: number }[]> {
  if (!isLovableGatewayConfigured()) {
    throw new Error("Lovable AI Gateway not configured.");
  }

  const res = await fetch(`${config.endpoint}/detect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`Lovable Gateway detection error: ${res.status}`);
  const data = await res.json();
  return (data as { matches: { reference: string; confidence: number }[] }).matches || [];
}
