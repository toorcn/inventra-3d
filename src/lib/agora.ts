import { RtcRole, RtcTokenBuilder } from "agora-access-token";

const TOKEN_TTL_SECONDS = 60 * 60;

type AgoraConfig = {
  appId: string;
  appCertificate: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getAgoraConfig(): AgoraConfig {
  const appId = readEnv("AGORA_APP_ID");
  const appCertificate = readEnv("AGORA_APP_CERTIFICATE");

  const missing = [
    ["AGORA_APP_ID", appId],
    ["AGORA_APP_CERTIFICATE", appCertificate],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");
    throw new Error(`Agora RTC is missing required environment variables: ${names}`);
  }

  return {
    appId: appId!,
    appCertificate: appCertificate!,
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
