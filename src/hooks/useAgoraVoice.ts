"use client";

import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  IAgoraRTC,
} from "agora-rtc-sdk-ng";
import type {
  AgoraVoicePrepareResponse,
  AgoraVoiceStartResponse,
} from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "live" | "error";

interface UseAgoraVoiceProps {
  inventionId: string;
  componentId?: string | null;
}

type ActiveSession = {
  agentId: string;
  channelName: string;
  userRtcUid: number;
};

export function useAgoraVoice({ inventionId, componentId }: UseAgoraVoiceProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteUsersRef = useRef<Map<number | string, IAgoraRTCRemoteUser>>(new Map());
  const sessionRef = useRef<ActiveSession | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");

  const cleanupRtc = useCallback(async () => {
    const client = clientRef.current;
    const localTrack = localTrackRef.current;

    localTrack?.stop();
    localTrack?.close();
    localTrackRef.current = null;

    if (client) {
      for (const user of remoteUsersRef.current.values()) {
        user.audioTrack?.stop();
      }
      remoteUsersRef.current.clear();
      try {
        await client.leave();
      } catch {
        // Ignore cleanup errors when the client is already torn down.
      }
    }

    clientRef.current = null;
  }, []);

  const stopVoice = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;

    try {
      if (session?.agentId) {
        await fetch("/api/agora/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: session.agentId }),
        });
      }
    } finally {
      await cleanupRtc();
      setStatus("idle");
      setError(null);
    }
  }, [cleanupRtc]);

  useEffect(() => {
    return () => {
      void stopVoice();
    };
  }, [stopVoice]);

  const startVoice = useCallback(async () => {
    if (status === "connecting" || status === "live") {
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      const rtcModule = (await import("agora-rtc-sdk-ng")) as { default: IAgoraRTC };
      const prepareResponse = await fetch("/api/agora/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventionId }),
      });

      const preparePayload = (await prepareResponse.json()) as AgoraVoicePrepareResponse | { error?: string };
      if ("error" in preparePayload && preparePayload.error) {
        throw new Error(preparePayload.error);
      }

      const session = preparePayload as AgoraVoicePrepareResponse;
      const client: IAgoraRTCClient = rtcModule.default.createClient({ mode: "rtc", codec: "vp8" });

      client.on("user-published", async (user, mediaType) => {
        remoteUsersRef.current.set(user.uid, user);
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
          user.audioTrack?.stop();
        }
      });

      await client.join(session.appId, session.channelName, session.token, session.userRtcUid);
      const localTrack = await rtcModule.default.createMicrophoneAudioTrack();
      await client.publish([localTrack]);

      clientRef.current = client;
      localTrackRef.current = localTrack;

      const startResponse = await fetch("/api/agora/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventionId,
          componentId: componentId ?? undefined,
          channelName: session.channelName,
          userRtcUid: session.userRtcUid,
        }),
      });

      const startPayload = (await startResponse.json()) as AgoraVoiceStartResponse | { error?: string };
      if ("error" in startPayload && startPayload.error) {
        throw new Error(startPayload.error);
      }

      sessionRef.current = {
        agentId: (startPayload as AgoraVoiceStartResponse).agentId,
        channelName: session.channelName,
        userRtcUid: session.userRtcUid,
      };
      setStatus("live");
    } catch (err) {
      await cleanupRtc();
      sessionRef.current = null;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Agora voice failed to start.");
    }
  }, [cleanupRtc, componentId, inventionId, status]);

  return {
    error,
    isActive: status === "live",
    isConnecting: status === "connecting",
    startVoice,
    status,
    stopVoice,
  };
}
