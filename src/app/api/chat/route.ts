import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { buildInventionContext } from "@/lib/invention-context";
import { chatCompletion } from "@/lib/openrouter";
import type { ChatMessage, ChatRequest } from "@/types";

function toOpenRouterMessages(messages: ChatMessage[]): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

function textStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ChatRequest;
    const invention = getInventionById(body.inventionId);

    if (!invention) {
      return Response.json({ error: "Invention not found" }, { status: 404 });
    }

    const component = body.componentId ? getComponentById(body.componentId) : undefined;
    const systemPrompt = buildInventionContext(invention, component);

    const completion = await chatCompletion([
      { role: "system", content: systemPrompt },
      ...toOpenRouterMessages(body.messages),
    ]);

    return new Response(textStream(completion), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    return Response.json({ error: message }, { status: 500 });
  }
}
