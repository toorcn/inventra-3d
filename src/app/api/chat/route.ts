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
    const body = (await request.json()) as ChatRequest;
    const invention = getInventionById(body.inventionId);

    if (!invention) {
      return Response.json({ error: "Invention not found" }, { status: 404 });
    }

    const component = body.componentId ? getComponentById(body.componentId) : undefined;
    const result = await runExpertAgent(
      invention,
      toOpenRouterMessages(body.messages),
      component,
    );

    const response: ChatResponse = {
      content: result.content,
      actions: result.actions,
    };

    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    return Response.json({ error: message }, { status: 500 });
  }
}
