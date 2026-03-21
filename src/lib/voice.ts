import { getAgoraVoiceConfig, hasAgoraVoiceConfig } from "@/lib/agora";

export function getVoiceConfig() {
  return getAgoraVoiceConfig();
}

export function hasVoiceConfig() {
  return hasAgoraVoiceConfig();
}
