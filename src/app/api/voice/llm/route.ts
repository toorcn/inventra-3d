import { randomUUID } from "node:crypto";
import { extractLatestUserMessage } from "@/lib/agora";
import { processVoiceWebhookTurn } from "@/lib/chat-service";
import { getVoiceSession } from "@/lib/voice-session-store";
import type { ChatMessage, VoiceAgentWebhookRequest, VoiceAgentWebhookResponse } from "@/types";

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
    const userText = extractLatestUserMessage(body);

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

    const result = await processVoiceWebhookTurn({
      sessionId,
      requestMessages,
    });

    const response: VoiceAgentWebhookResponse = {
      id: `chatcmpl-${randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model ?? "inventornet-voice-agent",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: result.content,
          },
        },
      ],
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice webhook error";
    return Response.json({ error: message }, { status: 500 });
  }
}
