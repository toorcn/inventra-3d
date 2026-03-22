import { createHmac, timingSafeEqual } from "node:crypto";

export type VoiceWebhookTokenPayload = {
  sessionId: string;
  inventionId: string;
  componentId?: string;
  llmApiKey: string;
};

function secret(): string {
  const s = process.env.AGORA_APP_CERTIFICATE;
  if (!s) throw new Error("AGORA_APP_CERTIFICATE is required for webhook token signing");
  return s;
}

export function signVoiceWebhookToken(payload: VoiceWebhookTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyVoiceWebhookToken(token: string): VoiceWebhookTokenPayload {
  const dot = token.lastIndexOf(".");
  if (dot === -1) throw new Error("Malformed voice webhook token");

  const encoded = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(
    createHmac("sha256", secret()).update(encoded).digest("base64url"),
    "base64url",
  );

  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new Error("Invalid voice webhook token signature");
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString()) as VoiceWebhookTokenPayload;
}
