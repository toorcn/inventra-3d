import { transcribeWithWhisper } from "@/lib/voice";
import type { VoiceTranscribeResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }

    const languageValue = formData.get("language");
    const language =
      typeof languageValue === "string" && languageValue.trim().length > 0
        ? languageValue.trim()
        : undefined;
    const text = await transcribeWithWhisper(file, language);

    const response: VoiceTranscribeResponse = { text };
    return Response.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice transcription error";
    return Response.json({ error: message }, { status: 500 });
  }
}
