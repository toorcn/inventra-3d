import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { runExpertAgent } from "@/lib/expert-agent";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/types";

function toOpenRouterMessages(messages: ChatMessage[]): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

export async function POST(request: Request): Promise<Response> {
  try {
    console.info("[InventorNet][API][Chat] Request received");
    const body = (await request.json()) as ChatRequest;
    console.info("[InventorNet][API][Chat] Stage passed: request body parsed", {
      inventionId: body.inventionId,
      componentId: body.componentId ?? null,
      messageCount: body.messages.length,
    });
    const invention = getInventionById(body.inventionId);

    if (!invention) {
      console.warn("[InventorNet][API][Chat] Invention not found", {
        inventionId: body.inventionId,
      });
      return Response.json({ error: "Invention not found" }, { status: 404 });
    }

    const component = body.componentId ? getComponentById(body.componentId) : undefined;
    console.info("[InventorNet][API][Chat] Stage: running expert agent");
    const result = await runExpertAgent(
      invention,
      toOpenRouterMessages(body.messages),
      component,
    );
    console.info("[InventorNet][API][Chat] Stage passed: expert agent complete", {
      actionCount: result.actions.length,
    });

    const response: ChatResponse = {
      content: result.content,
      actions: result.actions,
    };

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
