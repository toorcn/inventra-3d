type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CompletionOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

function hasApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "InventorNet",
  };
}

export async function chatCompletion(
  messages: OpenRouterMessage[],
  options: CompletionOptions = {},
): Promise<string> {
  if (!hasApiKey()) {
    console.info("[InventorNet][OpenRouter] Chat completion running in offline fallback mode");
    const prompt = messages[messages.length - 1]?.content ?? "";
    return `I'm currently operating in offline mode. For \"${prompt}\", I can tell you that this relates to the fundamental principles of the invention's design and history. To get more detailed AI-generated insights, please ensure the system is fully connected.`;
  }

  console.info("[InventorNet][OpenRouter] Stage: sending chat completion request", {
    model: options.model ?? DEFAULT_MODEL,
    messageCount: messages.length,
  });
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 500,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[InventorNet][OpenRouter] Chat completion failed", {
      status: response.status,
      body,
    });
    throw new Error(`OpenRouter completion failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  console.info("[InventorNet][OpenRouter] Stage passed: chat completion response received");
  return payload?.choices?.[0]?.message?.content ?? "";
}

export async function structuredOutput<T>(
  messages: OpenRouterMessage[],
  schema: Record<string, unknown>,
  options: CompletionOptions = {},
): Promise<T> {
  if (!hasApiKey()) {
    console.info("[InventorNet][OpenRouter] Structured output requested without API key");
    throw new Error("structuredOutput requires OPENROUTER_API_KEY");
  }

  console.info("[InventorNet][OpenRouter] Stage: sending structured output request", {
    model: options.model ?? DEFAULT_MODEL,
    messageCount: messages.length,
  });
  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.max_tokens ?? 600,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inventornet_schema",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[InventorNet][OpenRouter] Structured output failed", {
      status: response.status,
      body,
    });
    throw new Error(`OpenRouter structured output failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("[InventorNet][OpenRouter] Structured output returned empty content");
    throw new Error("OpenRouter structured output returned empty content");
  }

  console.info("[InventorNet][OpenRouter] Stage passed: structured output response received");
  return JSON.parse(content) as T;
}

export async function chatCompletionStream(
  messages: OpenRouterMessage[],
  options: CompletionOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  if (!hasApiKey()) {
    const encoder = new TextEncoder();
    const text = `I'm currently providing a baseline explanation for ${messages[messages.length - 1]?.content ?? "your question"}. For more comprehensive, real-time responses, please check the system connection.`;
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 600,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(`OpenRouter stream failed (${response.status}): ${body}`);
  }

  return response.body;
}

export type { OpenRouterMessage };
export const hasOpenRouterApiKey = hasApiKey;
