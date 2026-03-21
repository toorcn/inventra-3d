import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

let client: IAgoraRTCClient | null = null;

export async function initAgora(channelName: string): Promise<IAgoraRTCClient | null> {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  if (!appId) {
    console.warn("Agora App ID not configured — using ElevenLabs-only fallback");
    return null;
  }

  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(appId, channelName, null);
  return client;
}

export async function leaveAgora() {
  if (client) {
    await client.leave();
    client = null;
  }
}
