const DEFAULT_WHISPER_MODEL = "whisper-1";
const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";

type VoiceConfig = {
  openAIApiKey: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  whisperModel: string;
  elevenLabsModelId: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getVoiceConfig(): VoiceConfig {
  const openAIApiKey = readEnv("OPENAI_API_KEY");
  const elevenLabsApiKey = readEnv("ELEVENLABS_API_KEY");
  const elevenLabsVoiceId = readEnv("ELEVENLABS_VOICE_ID");

  const missing = [
    ["OPENAI_API_KEY", openAIApiKey],
    ["ELEVENLABS_API_KEY", elevenLabsApiKey],
    ["ELEVENLABS_VOICE_ID", elevenLabsVoiceId],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");
    throw new Error(`Voice is missing required environment variables: ${names}`);
  }

  return {
    openAIApiKey: openAIApiKey!,
    elevenLabsApiKey: elevenLabsApiKey!,
    elevenLabsVoiceId: elevenLabsVoiceId!,
    whisperModel: readEnv("OPENAI_WHISPER_MODEL") ?? DEFAULT_WHISPER_MODEL,
    elevenLabsModelId: readEnv("ELEVENLABS_MODEL_ID") ?? DEFAULT_ELEVENLABS_MODEL,
  };
}

export async function transcribeWithWhisper(file: File, language?: string): Promise<string> {
  const config = getVoiceConfig();
  const formData = new FormData();
  formData.append("file", file, file.name || "voice-turn.webm");
  formData.append("model", config.whisperModel);
  if (language) {
    formData.append("language", language);
  }
  formData.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAIApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { text?: string };
  if (typeof payload.text !== "string") {
    throw new Error("Whisper transcription failed: missing text");
  }

  return payload.text;
}

export async function synthesizeWithElevenLabs(text: string): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const config = getVoiceConfig();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": config.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: config.elevenLabsModelId,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${body}`);
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
  };
}
