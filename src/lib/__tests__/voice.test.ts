import { afterEach, describe, expect, it } from "vitest";
import { getVoiceConfig } from "@/lib/voice";

const trackedKeys = [
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "OPENAI_WHISPER_MODEL",
  "ELEVENLABS_MODEL_ID",
] as const;

const originalValues = Object.fromEntries(
  trackedKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof trackedKeys)[number], string | undefined>;

afterEach(() => {
  trackedKeys.forEach((key) => {
    const value = originalValues[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

describe("getVoiceConfig", () => {
  it("throws when required voice env vars are missing", () => {
    trackedKeys.forEach((key) => {
      delete process.env[key];
    });

    expect(() => getVoiceConfig()).toThrow(
      "Voice is missing required environment variables",
    );
  });

  it("uses defaults when optional model overrides are omitted", () => {
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs";
    process.env.ELEVENLABS_VOICE_ID = "test-voice";
    delete process.env.OPENAI_WHISPER_MODEL;
    delete process.env.ELEVENLABS_MODEL_ID;

    const config = getVoiceConfig();

    expect(config.openAIApiKey).toBe("test-openai");
    expect(config.elevenLabsApiKey).toBe("test-elevenlabs");
    expect(config.elevenLabsVoiceId).toBe("test-voice");
    expect(config.whisperModel).toBe("whisper-1");
    expect(config.elevenLabsModelId).toBe("eleven_multilingual_v2");
  });
});
