import { randomUUID } from "node:crypto";
import { extractLatestUserMessage } from "@/lib/agora";
import { processVoiceWebhookTurnStreaming } from "@/lib/chat-service";
import { updateVoiceSessionLastAgoraText, getVoiceSession } from "@/lib/voice-session-store";
import { verifyVoiceWebhookToken } from "@/lib/voice-webhook-token";
import type { ChatMessage, VoiceAgentWebhookRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  return apiKey || null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawToken = url.searchParams.get("t")?.trim();

    if (!rawToken) {
      return Response.json({ error: "Missing token" }, { status: 400 });
    }

    let tokenPayload: Awaited<ReturnType<typeof verifyVoiceWebhookToken>>;
    try {
      tokenPayload = verifyVoiceWebhookToken(rawToken);
    } catch {
      return Response.json({ error: "Unauthorized voice webhook request" }, { status: 401 });
    }

    const { sessionId, inventionId, componentId, llmApiKey } = tokenPayload;

    const incomingKey = readBearerToken(request);
    if (!incomingKey || incomingKey !== llmApiKey) {
      return Response.json({ error: "Unauthorized voice webhook request" }, { status: 401 });
    }

    const body = (await request.json()) as VoiceAgentWebhookRequest;
    const fullUserText = extractLatestUserMessage(body);

    if (!fullUserText) {
      return Response.json({ error: "Missing user content" }, { status: 400 });
    }

    // Best-effort deduplication using the in-memory store (works when the same
    // serverless instance is reused; silently skipped otherwise).
    let userText = fullUserText;
    try {
      const session = getVoiceSession(sessionId);
      const prevAgoraText = session.lastAgoraAccumulatedText ?? "";
      if (prevAgoraText && fullUserText.startsWith(prevAgoraText)) {
        userText = fullUserText.slice(prevAgoraText.length).trim() || fullUserText;
      }
      updateVoiceSessionLastAgoraText(sessionId, fullUserText);
    } catch {
      // Session not in this instance's memory — use the full text as-is.
    }

    const requestMessages: ChatMessage[] = [
      {
        id: randomUUID(),
        role: "user",
        content: userText,
        delivery: "spoken",
        timestamp: Date.now(),
      },
    ];

    // Agora's full conversation history (minus system messages) for LLM context.
    const agoraMessages = body.messages.filter((m) => m.role !== "system");

    const stream = await processVoiceWebhookTurnStreaming({
      sessionId,
      inventionId,
      componentId,
      requestMessages,
      agoraMessages,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice webhook error";
    return Response.json({ error: message }, { status: 500 });
  }
}
