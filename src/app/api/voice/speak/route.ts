import { synthesizeWithElevenLabs } from "@/lib/voice";
import type { VoiceSpeakRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as VoiceSpeakRequest;
    const text = body.text.trim();

    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const { audio, contentType } = await synthesizeWithElevenLabs(text);
    return new Response(audio, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice synthesis error";
    return Response.json({ error: message }, { status: 500 });
  }
}
