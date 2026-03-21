import { NextRequest, NextResponse } from "next/server";
import { PERSONA_VOICES, textToSpeech } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
      { status: 503 }
    );
  }

  try {
    const { text, persona } = await request.json();

    // Look up voice ID by persona name, fallback to first voice
    const voiceId =
      PERSONA_VOICES[persona] ?? Object.values(PERSONA_VOICES)[0];

    const audioBuffer = await textToSpeech(text, voiceId);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
