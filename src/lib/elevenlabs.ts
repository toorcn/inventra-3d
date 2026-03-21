// Persona voice IDs — replace with actual ElevenLabs voice IDs after setup
export const PERSONA_VOICES: Record<string, string> = {
  "Dr. Alexander Bell": "pNInz6obpgDQGcFmaJgB",      // placeholder
  "Jony": "21m00Tcm4TlvDq8ikWAM",                      // placeholder
  "Mr. James Watt": "AZnzlk1XvdvUeBnXmlld",            // placeholder
  "Professor Galileo": "EXAVITQu4vr4xnSDxMaL",          // placeholder
};

export async function textToSpeech(
  text: string,
  personaVoiceId: string
): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${personaVoiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
  }

  return response.arrayBuffer();
}
