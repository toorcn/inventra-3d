"use client";

import type {
  ChatMessage,
  ExpertAction,
  VoiceSessionEvent,
  VoiceSessionPollResponse,
  VoiceSessionResponse,
  VoiceSessionStatus,
} from "@/types";
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceSessionProps {
  inventionId: string;
  componentId?: string | null;
  onMessages?: (messages: ChatMessage[]) => void;
  onActions?: (actions: ExpertAction[]) => void;
}

type AgoraModule = typeof import("agora-rtc-sdk-ng");

export type VoiceStatus = VoiceSessionStatus;

function decodeStreamPayload(payload: Uint8Array | string): string {
  if (typeof payload === "string") {
    return payload;
  }

  return new TextDecoder().decode(payload);
}

function toVoiceStatus(value: unknown): VoiceSessionStatus | null {
  return value === "disabled" ||
    value === "idle" ||
    value === "connecting" ||
    value === "connected" ||
    value === "listening" ||
    value === "thinking" ||
    value === "speaking" ||
    value === "disconnecting" ||
    value === "error"
    ? value
    : null;
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

function parseRtcVoiceEvent(
  payload: Uint8Array | string,
): { partialTranscript?: string | null; status?: VoiceSessionStatus } | null {
  try {
    const raw = JSON.parse(decodeStreamPayload(payload)) as Record<string, unknown>;
    const eventName = String(raw.type ?? raw.event ?? raw.kind ?? "").toLowerCase();
    const textValue =
      typeof raw.text === "string"
        ? raw.text
        : typeof raw.content === "string"
          ? raw.content
          : typeof raw.message === "string"
            ? raw.message
            : null;
    const isFinal = raw.final === true || raw.isFinal === true || raw.is_final === true;

    if (eventName.includes("thinking")) {
      return { status: "thinking" };
    }

    if (eventName.includes("speaking")) {
      return { status: "speaking" };
    }

    if (eventName.includes("listening")) {
      return { status: "listening" };
    }

    if (textValue && (eventName.includes("temp") || eventName.includes("interim"))) {
      return { partialTranscript: textValue, status: "listening" };
    }

    if (textValue && eventName.includes("transcript")) {
      return { partialTranscript: isFinal ? null : textValue };
    }
  } catch {
    return null;
  }

  return null;
}

export function useVoiceSession({
  inventionId,
  componentId,
  onMessages,
  onActions,
}: UseVoiceSessionProps) {
  const agoraModuleRef = useRef<AgoraModule | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const cursorRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef(1200);
  const destroyedRef = useRef(false);
  const statusRef = useRef<VoiceSessionStatus>("idle");

  const [error, setError] = useState<string | null>(null);
  const [partialTranscript, setPartialTranscript] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceSessionStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const teardownRtc = useCallback(async () => {
    const localTrack = localAudioTrackRef.current;
    const client = clientRef.current;

    localAudioTrackRef.current = null;
    clientRef.current = null;

    if (localTrack) {
      try {
        localTrack.stop();
        localTrack.close();
      } catch {
        // Ignore RTC teardown errors during cleanup.
      }
    }

    if (client) {
      try {
        await client.leave();
      } catch {
        // Ignore RTC leave errors during cleanup.
      }
    }
  }, []);

  const cleanupVoiceSession = useCallback(
    async ({ announceDisconnect }: { announceDisconnect: boolean }) => {
      stopPolling();
      const activeSessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      setSessionId(null);
      setPartialTranscript(null);

      if (announceDisconnect && statusRef.current !== "disabled") {
        setStatus("disconnecting");
      }

      try {
        if (activeSessionId) {
          await fetch("/api/voice/agent/remove", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId: activeSessionId }),
          });
        }
      } catch {
        // Local teardown still needs to proceed.
      } finally {
        cursorRef.current = 0;
        await teardownRtc();
        if (!destroyedRef.current && announceDisconnect) {
          setStatus((current) => (current === "disabled" ? "disabled" : "idle"));
          setError(null);
        }
      }
    },
    [stopPolling, teardownRtc],
  );

  const getAgoraModule = useCallback(async () => {
    if (!agoraModuleRef.current) {
      agoraModuleRef.current = await import("agora-rtc-sdk-ng");
    }

    return agoraModuleRef.current;
  }, []);

  const pollSession = useCallback(
    async (activeSessionId: string) => {
      try {
        const response = await fetch(
          `/api/voice/session?sessionId=${encodeURIComponent(activeSessionId)}&cursor=${cursorRef.current}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as VoiceSessionPollResponse | { error?: string };

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Voice session polling failed."));
        }

        if (destroyedRef.current || sessionIdRef.current !== activeSessionId) {
          return;
        }

        const pollPayload = payload as VoiceSessionPollResponse;
        cursorRef.current = pollPayload.cursor;
        setPartialTranscript(pollPayload.partialTranscript);

        if (pollPayload.status !== "disconnecting") {
          setStatus(pollPayload.status);
        }

        const nextMessages: ChatMessage[] = [];
        for (const event of pollPayload.events) {
          if (event.type === "message") {
            nextMessages.push(event.message);
            continue;
          }

          onActions?.(event.actions);
        }

        if (nextMessages.length > 0) {
          onMessages?.(nextMessages);
        }
      } catch (err) {
        if (!destroyedRef.current && sessionIdRef.current === activeSessionId) {
          setError(err instanceof Error ? err.message : "Voice session polling failed.");
          setStatus("error");
        }
      } finally {
        if (!destroyedRef.current && sessionIdRef.current === activeSessionId) {
          pollTimeoutRef.current = window.setTimeout(() => {
            void pollSession(activeSessionId);
          }, pollIntervalRef.current);
        }
      }
    },
    [onActions, onMessages],
  );

  const refreshAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/session", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as VoiceSessionResponse | { error?: string };

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, "Voice availability check failed."));
      }

      const availability = payload as VoiceSessionResponse;
      pollIntervalRef.current = availability.pollIntervalMs ?? 1200;

      if (!availability.enabled) {
        setStatus("disabled");
        setError(availability.error ?? null);
        return;
      }

      setError(null);
      setStatus((current) => (current === "disabled" ? "idle" : current));
    } catch (err) {
      setStatus("disabled");
      setError(err instanceof Error ? err.message : "Voice availability check failed.");
    }
  }, []);

  const disconnectVoice = useCallback(async () => {
    await cleanupVoiceSession({ announceDisconnect: true });
  }, [cleanupVoiceSession]);

  const connectVoice = useCallback(async () => {
    if (status === "disabled" || status === "connecting" || status === "disconnecting") {
      return;
    }

    setError(null);
    setPartialTranscript(null);
    setStatus("connecting");

    let nextSessionId: string | null = null;

    try {
      const module = await getAgoraModule();
      const sessionResponse = await fetch("/api/voice/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventionId,
          componentId: componentId ?? null,
        }),
      });
      const sessionPayload = (await sessionResponse.json()) as VoiceSessionResponse | { error?: string };

      if (!sessionResponse.ok) {
        throw new Error(readErrorMessage(sessionPayload, "Voice session start failed."));
      }

      const sessionData = sessionPayload as VoiceSessionResponse;
      if (!sessionData.enabled || !sessionData.sessionId || !sessionData.appId || !sessionData.channelName) {
        setStatus("disabled");
        setError(sessionData.error ?? "Live voice is not configured.");
        return;
      }

      nextSessionId = sessionData.sessionId;
      sessionIdRef.current = nextSessionId;
      setSessionId(nextSessionId);
      cursorRef.current = sessionData.cursor ?? 0;
      pollIntervalRef.current = sessionData.pollIntervalMs ?? pollIntervalRef.current;

      const client = module.default.createClient({
        mode: "rtc",
        codec: "vp8",
      });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        if (mediaType !== "audio") {
          return;
        }

        await client.subscribe(user, "audio");
        user.audioTrack?.play();
      });

      client.on("stream-message", (_uid, payload) => {
        const event = parseRtcVoiceEvent(payload);
        if (!event) {
          return;
        }

        if (event.partialTranscript !== undefined) {
          setPartialTranscript(event.partialTranscript);
        }

        if (event.status) {
          setStatus(event.status);
        }
      });

      const localTrack = await module.default.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localTrack;

      await client.join(
        sessionData.appId,
        sessionData.channelName,
        sessionData.rtcToken ?? null,
        sessionData.rtcUid ?? null,
      );
      await client.publish([localTrack]);

      const inviteResponse = await fetch("/api/voice/agent/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: nextSessionId,
        }),
      });
      const invitePayload = (await inviteResponse.json()) as { error?: string };
      if (!inviteResponse.ok) {
        throw new Error(readErrorMessage(invitePayload, "Voice agent invite failed."));
      }

      setStatus("listening");
      void pollSession(nextSessionId);
    } catch (err) {
      if (nextSessionId) {
        sessionIdRef.current = nextSessionId;
        setSessionId(nextSessionId);
        await cleanupVoiceSession({ announceDisconnect: false });
      } else {
        await teardownRtc();
      }

      if (!destroyedRef.current) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Live voice connection failed.");
      }
    }
  }, [
    componentId,
    cleanupVoiceSession,
    disconnectVoice,
    getAgoraModule,
    inventionId,
    pollSession,
    status,
    teardownRtc,
  ]);

  const toggleConnection = useCallback(async () => {
    if (sessionIdRef.current) {
      await disconnectVoice();
      return;
    }

    await connectVoice();
  }, [connectVoice, disconnectVoice]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  useEffect(() => {
    destroyedRef.current = false;

    return () => {
      destroyedRef.current = true;
      stopPolling();
      const client = clientRef.current;
      const localTrack = localAudioTrackRef.current;

      localAudioTrackRef.current = null;
      clientRef.current = null;
      sessionIdRef.current = null;

      if (localTrack) {
        try {
          localTrack.stop();
          localTrack.close();
        } catch {
          // Ignore track cleanup errors during unmount.
        }
      }

      if (client) {
        void client.leave().catch(() => {
          // Ignore leave failures during unmount.
        });
      }
    };
  }, [stopPolling]);

  useEffect(() => {
    if (!sessionIdRef.current) {
      return;
    }

    void fetch("/api/voice/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        inventionId,
        componentId: componentId ?? null,
      }),
    });
  }, [componentId, inventionId]);

  return {
    error,
    isConnected: Boolean(sessionId),
    partialTranscript,
    sessionId,
    status,
    toggleConnection,
    disconnectVoice,
  };
}
