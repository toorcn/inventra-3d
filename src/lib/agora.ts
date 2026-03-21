import { buildInventionContext } from "@/lib/invention-context";
import type { Invention, InventionComponent, VoiceAgentWebhookRequest } from "@/types";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";
import type { VoiceSessionRecord } from "./voice-session-store";

const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const AGORA_CONVO_AI_BASE_URL = "https://api.agora.io/api/conversational-ai-agent/v2/projects";
const RTC_TOKEN_LIFETIME_SECONDS = 60 * 60;

type AgoraVoiceConfig = {
  appId: string;
  appCertificate: string;
  customerId: string;
  customerSecret: string;
  appUrl: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsModelId: string;
};

export interface AgoraAgentJoinPayload {
  name: string;
  properties: {
    channel: string;
    token: string;
    agent_rtc_uid: string;
    remote_rtc_uids: string[];
    idle_timeout: number;
    asr: {
      language: string;
      task: "conversation";
    };
    llm: {
      url: string;
      api_key: string;
      system_messages: Array<{
        role: "system";
        content: string;
      }>;
      greeting_message: string;
      failure_message: string;
      max_history: number;
      input_modalities: ["text"];
      output_modalities: ["text"];
      request_timeout_ms: number;
      params: {
        model: string;
        max_tokens: number;
        temperature: number;
      };
    };
    vad: {
      silence_duration_ms: number;
      speech_duration_ms: number;
      threshold: number;
      interrupt_duration_ms: number;
      prefix_padding_ms: number;
    };
    tts: {
      vendor: "elevenlabs";
      params: {
        key: string;
        voice_id: string;
        model_id: string;
      };
    };
  };
}

type AgoraAgentJoinResponse = {
  agent_id?: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function hasAgoraVoiceConfig(): boolean {
  return Boolean(
    readEnv("NEXT_PUBLIC_AGORA_APP_ID") &&
      readEnv("AGORA_APP_CERTIFICATE") &&
      readEnv("AGORA_CUSTOMER_ID") &&
      readEnv("AGORA_CUSTOMER_SECRET") &&
      readEnv("ELEVENLABS_API_KEY") &&
      readEnv("ELEVENLABS_VOICE_ID"),
  );
}

export function getAgoraVoiceConfig(): AgoraVoiceConfig {
  const appId = readEnv("NEXT_PUBLIC_AGORA_APP_ID");
  const appCertificate = readEnv("AGORA_APP_CERTIFICATE");
  const customerId = readEnv("AGORA_CUSTOMER_ID");
  const customerSecret = readEnv("AGORA_CUSTOMER_SECRET");
  const elevenLabsApiKey = readEnv("ELEVENLABS_API_KEY");
  const elevenLabsVoiceId = readEnv("ELEVENLABS_VOICE_ID");

  const missing = [
    ["NEXT_PUBLIC_AGORA_APP_ID", appId],
    ["AGORA_APP_CERTIFICATE", appCertificate],
    ["AGORA_CUSTOMER_ID", customerId],
    ["AGORA_CUSTOMER_SECRET", customerSecret],
    ["ELEVENLABS_API_KEY", elevenLabsApiKey],
    ["ELEVENLABS_VOICE_ID", elevenLabsVoiceId],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");
    throw new Error(`Voice is missing required environment variables: ${names}`);
  }

  return {
    appId: appId!,
    appCertificate: appCertificate!,
    customerId: customerId!,
    customerSecret: customerSecret!,
    appUrl: readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
    elevenLabsApiKey: elevenLabsApiKey!,
    elevenLabsVoiceId: elevenLabsVoiceId!,
    elevenLabsModelId: readEnv("ELEVENLABS_MODEL_ID") ?? DEFAULT_ELEVENLABS_MODEL,
  };
}

function getAgoraAuthHeader(config: AgoraVoiceConfig): string {
  return `Basic ${Buffer.from(`${config.customerId}:${config.customerSecret}`).toString("base64")}`;
}

function getAgoraProjectBaseUrl(config: AgoraVoiceConfig): string {
  return `${AGORA_CONVO_AI_BASE_URL}/${config.appId}`;
}

function getCustomLlmUrl(config: AgoraVoiceConfig, session: VoiceSessionRecord): string {
  const url = new URL("/api/voice/llm", config.appUrl);
  url.searchParams.set("sessionId", session.sessionId);
  return url.toString();
}

export function buildAgoraAgentJoinPayload(
  session: VoiceSessionRecord,
  invention: Invention,
  component?: InventionComponent,
): AgoraAgentJoinPayload {
  const config = getAgoraVoiceConfig();
  const systemMessage = buildInventionContext(invention, component);
  const agentRtcToken = buildAgoraRtcToken(session.channelName, session.agentRtcUid);

  return {
    name: `inventra-agent-${session.sessionId}`,
    properties: {
      channel: session.channelName,
      token: agentRtcToken,
      agent_rtc_uid: String(session.agentRtcUid),
      remote_rtc_uids: [String(session.rtcUid)],
      idle_timeout: 300,
      asr: {
        language: "en-US",
        task: "conversation",
      },
      llm: {
        url: getCustomLlmUrl(config, session),
        api_key: session.llmApiKey,
        system_messages: [
          {
            role: "system",
            content: systemMessage,
          },
        ],
        greeting_message: "",
        failure_message: "Please wait a moment while I gather a precise answer.",
        max_history: 32,
        input_modalities: ["text"],
        output_modalities: ["text"],
        request_timeout_ms: 25000,
        params: {
          model: DEFAULT_OPENROUTER_MODEL,
          max_tokens: 700,
          temperature: 0.2,
        },
      },
      vad: {
        silence_duration_ms: 700,
        speech_duration_ms: 12000,
        threshold: 0.6,
        interrupt_duration_ms: 200,
        prefix_padding_ms: 400,
      },
      tts: {
        vendor: "elevenlabs",
        params: {
          key: config.elevenLabsApiKey,
          voice_id: config.elevenLabsVoiceId,
          model_id: config.elevenLabsModelId,
        },
      },
    },
  };
}

export function buildAgoraRtcToken(channelName: string, uid: number, privilegeExpiredTs?: number): string {
  const config = getAgoraVoiceConfig();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = privilegeExpiredTs ?? issuedAt + RTC_TOKEN_LIFETIME_SECONDS;

  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expiresAt,
  );
}

async function callAgora(path: string, init: RequestInit): Promise<Response> {
  const config = getAgoraVoiceConfig();

  return fetch(`${getAgoraProjectBaseUrl(config)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAgoraAuthHeader(config),
      ...(init.headers ?? {}),
    },
  });
}

async function readAgoraErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable response body>";
  }
}

export async function inviteAgoraAgent(
  session: VoiceSessionRecord,
  invention: Invention,
  component?: InventionComponent,
): Promise<string> {
  const response = await callAgora("/join", {
    method: "POST",
    body: JSON.stringify(buildAgoraAgentJoinPayload(session, invention, component)),
  });

  if (!response.ok) {
    const body = await readAgoraErrorBody(response);
    throw new Error(`Agora agent invite failed [POST /join] (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as AgoraAgentJoinResponse;
  const agentId = payload.agent_id?.trim();

  if (!agentId) {
    throw new Error("Agora agent invite failed: missing agent_id");
  }

  return agentId;
}

export async function removeAgoraAgent(agentId: string): Promise<void> {
  const response = await callAgora(`/agents/${agentId}/leave`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await readAgoraErrorBody(response);
    throw new Error(`Agora agent remove failed [POST /agents/${agentId}/leave] (${response.status}): ${body}`);
  }
}

export async function speakAgoraAgent(agentId: string, text: string): Promise<void> {
  const trimmed = text.trim();

  if (!trimmed) {
    return;
  }

  const response = await callAgora(`/agents/${agentId}/speak`, {
    method: "POST",
    body: JSON.stringify({
      text: trimmed,
    }),
  });

  if (!response.ok) {
    const body = await readAgoraErrorBody(response);
    throw new Error(`Agora agent speak failed [POST /agents/${agentId}/speak] (${response.status}): ${body}`);
  }
}

export function extractLatestUserMessage(request: VoiceAgentWebhookRequest): string {
  for (let index = request.messages.length - 1; index >= 0; index -= 1) {
    const message = request.messages[index];
    if (message.role === "user" && message.content.trim()) {
      return message.content.trim();
    }
  }

  return "";
}
