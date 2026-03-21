import { getComponentById } from "@/data/invention-components";
import { getInventionById } from "@/data/inventions";
import { buildVoiceAgentContext } from "@/lib/invention-context";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

const AGORA_AGENT_UID = 0;
const DEFAULT_LLM_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_LLM_MODEL = "google/gemini-2.0-flash-001";
const TOKEN_TTL_SECONDS = 60 * 60;

type AgoraConfig = {
  appId: string;
  appCertificate: string;
  customerId: string;
  customerSecret: string;
  llmUrl: string;
  llmApiKey: string;
  llmModel: string;
  ttsVendor: string;
  ttsKey: string;
  ttsRegion?: string;
  ttsVoiceName?: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getAgoraConfig(): AgoraConfig {
  const appId = readEnv("AGORA_APP_ID");
  const appCertificate = readEnv("AGORA_APP_CERTIFICATE");
  const customerId = readEnv("AGORA_CUSTOMER_ID");
  const customerSecret = readEnv("AGORA_CUSTOMER_SECRET");
  const llmApiKey = readEnv("AGORA_LLM_API_KEY") ?? readEnv("OPENROUTER_API_KEY");
  const ttsVendor = readEnv("AGORA_TTS_VENDOR") ?? "microsoft";
  const ttsKey = readEnv("AGORA_TTS_KEY");

  const missing = [
    ["AGORA_APP_ID", appId],
    ["AGORA_APP_CERTIFICATE", appCertificate],
    ["AGORA_CUSTOMER_ID", customerId],
    ["AGORA_CUSTOMER_SECRET", customerSecret],
    ["AGORA_LLM_API_KEY or OPENROUTER_API_KEY", llmApiKey],
    ["AGORA_TTS_KEY", ttsKey],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");
    throw new Error(`Agora voice is missing required environment variables: ${names}`);
  }

  return {
    appId: appId!,
    appCertificate: appCertificate!,
    customerId: customerId!,
    customerSecret: customerSecret!,
    llmUrl: readEnv("AGORA_LLM_URL") ?? DEFAULT_LLM_URL,
    llmApiKey: llmApiKey!,
    llmModel: readEnv("AGORA_LLM_MODEL") ?? DEFAULT_LLM_MODEL,
    ttsVendor,
    ttsKey: ttsKey!,
    ttsRegion: readEnv("AGORA_TTS_REGION"),
    ttsVoiceName: readEnv("AGORA_TTS_VOICE_NAME"),
  };
}

export function buildAgoraSession(channelSeed: string) {
  const config = getAgoraConfig();
  const channelName = `inventornet-${channelSeed}-${Date.now().toString(36)}`;
  const userRtcUid = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channelName,
    userRtcUid,
    RtcRole.PUBLISHER,
    expiresAt,
  );

  return {
    appId: config.appId,
    channelName,
    token,
    userRtcUid,
    expiresAt,
  };
}

function buildAgoraAgentToken(channelName: string, expiresAt: number, config: AgoraConfig): string {
  return RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    channelName,
    AGORA_AGENT_UID,
    RtcRole.PUBLISHER,
    expiresAt,
  );
}

function buildAgoraAuthHeader(config: AgoraConfig): string {
  return Buffer.from(`${config.customerId}:${config.customerSecret}`).toString("base64");
}

function buildTtsParams(config: AgoraConfig): Record<string, string> {
  const params: Record<string, string> = {
    key: config.ttsKey,
  };

  if (config.ttsRegion) {
    params.region = config.ttsRegion;
  }

  if (config.ttsVoiceName) {
    params.voice_name = config.ttsVoiceName;
  }

  return params;
}

export async function startAgoraAgent(options: {
  inventionId: string;
  componentId?: string;
  channelName: string;
  userRtcUid: number;
}): Promise<string> {
  const invention = getInventionById(options.inventionId);
  if (!invention) {
    throw new Error("Invention not found");
  }

  const component = options.componentId ? getComponentById(options.componentId) : undefined;
  const config = getAgoraConfig();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = buildAgoraAgentToken(options.channelName, expiresAt, config);
  const systemPrompt = buildVoiceAgentContext(invention, component);

  const response = await fetch(
    `https://api.agora.io/api/conversational-ai-agent/v2/projects/${config.appId}/join`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${buildAgoraAuthHeader(config)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `inventornet-${crypto.randomUUID()}`,
        properties: {
          channel: options.channelName,
          token,
          agent_rtc_uid: String(AGORA_AGENT_UID),
          remote_rtc_uids: [String(options.userRtcUid)],
          enable_string_uid: false,
          idle_timeout: 120,
          llm: {
            url: config.llmUrl,
            api_key: config.llmApiKey,
            system_messages: [
              {
                role: "system",
                content: systemPrompt,
              },
            ],
            greeting_message: `Hello. I am ready to talk about ${invention.title}.`,
            failure_message: "Sorry, I lost the thread for a moment. Please ask again.",
            max_history: 12,
            params: {
              model: config.llmModel,
            },
          },
          asr: {
            language: "en-US",
          },
          tts: {
            vendor: config.ttsVendor,
            params: buildTtsParams(config),
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Agora agent start failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { agent_id?: string };
  if (!payload.agent_id) {
    throw new Error("Agora agent start failed: missing agent_id");
  }

  return payload.agent_id;
}

export async function stopAgoraAgent(agentId: string): Promise<void> {
  const config = getAgoraConfig();
  const response = await fetch(
    `https://api.agora.io/api/conversational-ai-agent/v2/projects/${config.appId}/agents/${agentId}/leave`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${buildAgoraAuthHeader(config)}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Agora agent stop failed (${response.status}): ${body}`);
  }
}
