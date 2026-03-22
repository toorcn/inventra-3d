import { processChatTurn } from "@/lib/chat-service";
import type { ChatRequest, ChatResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    console.info("[InventorNet][API][Chat] Request received");
    const body = (await request.json()) as ChatRequest;
    const latestUserMessage = [...body.messages].reverse().find((message) => message.role === "user");
    const response: ChatResponse = await processChatTurn({
      inventionId: body.inventionId,
      componentId: body.componentId,
      viewerState: body.viewerState,
      requestMessages: body.messages,
      delivery: latestUserMessage?.delivery ?? "typed",
      sessionId: body.sessionId,
      clientMessageId: body.clientMessageId,
    });

    console.info("[InventorNet][API][Chat] Response ready");
    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    console.error("[InventorNet][API][Chat] Request failed", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
