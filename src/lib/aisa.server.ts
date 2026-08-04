// Server-only AIsa helper. Never import this from client code.
// AIsa base URL: https://api.aisa.one/v1  ·  model ids are BARE (no vendor prefix).

export interface AisaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AisaOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callAisa(
  apiKey: string,
  messages: AisaMessage[],
  options: AisaOptions = {},
): Promise<string> {
  const res = await fetch("https://api.aisa.one/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1024,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("AIsa balance exhausted — top up at console.aisa.one.");
    if (res.status === 429) throw new Error("AIsa is rate limiting — try again shortly.");
    throw new Error(`AIsa failed (${res.status}). ${detail.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) throw new Error("AIsa returned an empty response.");
  return reply;
}

export async function callAisaJson<T>(
  apiKey: string,
  messages: AisaMessage[],
  options: AisaOptions = {},
): Promise<T> {
  const text = await callAisa(apiKey, messages, { ...options, model: options.model ?? "gpt-4o-mini" });
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AIsa did not return valid JSON. Response:\n${text.slice(0, 500)}`);
  }
}
