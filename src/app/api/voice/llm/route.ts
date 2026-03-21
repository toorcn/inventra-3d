import { randomUUID } from "node:crypto";
import { extractLatestUserMessage } from "@/lib/agora";
import { processVoiceWebhookTurnStreaming } from "@/lib/chat-service";
import { getVoiceSession } from "@/lib/voice-session-store";
import type { ChatMessage, VoiceAgentWebhookRequest } from "@/types";

export const runtime = "nodejs";

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
    const sessionId = url.searchParams.get("sessionId")?.trim();

    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = getVoiceSession(sessionId);
    const token = readBearerToken(request);

    if (!token || token !== session.llmApiKey) {
      return Response.json({ error: "Unauthorized voice webhook request" }, { status: 401 });
    }

    const body = (await request.json()) as VoiceAgentWebhookRequest;
    const fullUserText = extractLatestUserMessage(body);

    if (!fullUserText) {
      return Response.json({ error: "Missing user content" }, { status: 400 });
    }

    // Agora accumulates all user utterances into a single message each turn.
    // Extract only the new part by diffing against the last stored user message.
    const prevUserText = session.messages.findLast((m) => m.role === "user")?.content ?? "";
    const userText =
      prevUserText && fullUserText.startsWith(prevUserText)
        ? fullUserText.slice(prevUserText.length).trim()
        : fullUserText;

    if (!userText) {
      return Response.json({ error: "Missing user content" }, { status: 400 });
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

    const stream = await processVoiceWebhookTurnStreaming({
      sessionId,
      requestMessages,
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
