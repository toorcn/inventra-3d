import { afterEach, describe, expect, it } from "vitest";
import { getVoiceConfig } from "@/lib/voice";

const trackedKeys = [
  "NEXT_PUBLIC_AGORA_APP_ID",
  "AGORA_APP_CERTIFICATE",
  "AGORA_CUSTOMER_ID",
  "AGORA_CUSTOMER_SECRET",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_MODEL_ID",
  "NEXT_PUBLIC_APP_URL",
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

  it("uses defaults when optional overrides are omitted", () => {
    process.env.NEXT_PUBLIC_AGORA_APP_ID = "test-app-id";
    process.env.AGORA_APP_CERTIFICATE = "test-certificate";
    process.env.AGORA_CUSTOMER_ID = "test-customer";
    process.env.AGORA_CUSTOMER_SECRET = "test-secret";
    process.env.ELEVENLABS_API_KEY = "test-elevenlabs";
    process.env.ELEVENLABS_VOICE_ID = "test-voice";
    delete process.env.ELEVENLABS_MODEL_ID;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const config = getVoiceConfig();

    expect(config.appId).toBe("test-app-id");
    expect(config.appCertificate).toBe("test-certificate");
    expect(config.customerId).toBe("test-customer");
    expect(config.customerSecret).toBe("test-secret");
    expect(config.elevenLabsApiKey).toBe("test-elevenlabs");
    expect(config.elevenLabsVoiceId).toBe("test-voice");
    expect(config.elevenLabsModelId).toBe("eleven_multilingual_v2");
    expect(config.appUrl).toBe("http://localhost:3000");
  });
});
