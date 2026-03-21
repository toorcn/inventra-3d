"use client";

import type { ChatResponse, VoiceTranscribeResponse } from "@/types";
import type { IAgoraRTC, IAgoraRTCClient, ILocalAudioTrack } from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "live"
  | "recording"
  | "transcribing"
  | "speaking"
  | "error";

interface UseAgoraVoiceProps {
  inventionId: string;
  onSpokenTurn: (content: string) => Promise<ChatResponse>;
}

type ActiveSession = {
  channelName: string;
  userRtcUid: number;
};

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? response.statusText;
  }

  return response.text();
}

export function useAgoraVoice({ inventionId, onSpokenTurn }: UseAgoraVoiceProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<ILocalAudioTrack | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  const sessionTokenRef = useRef(0);
  const sessionCounterRef = useRef(0);
  const turnBufferRef = useRef<BlobPart[]>([]);
  const turnRecorderMimeTypeRef = useRef<string | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const stopPlayback = useCallback(() => {
    const audio = playbackAudioRef.current;
    const playbackUrl = playbackUrlRef.current;

    playbackAudioRef.current = null;
    playbackUrlRef.current = null;

    if (audio) {
      audio.pause();
      audio.src = "";
    }

    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
    }
  }, []);

  const cleanupRtc = useCallback(async () => {
    const recorder = recordingRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore recorder shutdown errors during cleanup.
      }
    }
    recordingRef.current = null;
    stopPlayback();

    const client = clientRef.current;
    const localTrack = localTrackRef.current;
    const stream = mediaStreamRef.current;

    if (client && localTrack) {
      try {
        await client.unpublish(localTrack);
      } catch {
        // Ignore cleanup failures if the track was never published.
      }
    }

    localTrack?.stop();
    localTrack?.close();
    localTrackRef.current = null;

    stream?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    turnBufferRef.current = [];
    turnRecorderMimeTypeRef.current = undefined;

    if (client) {
      try {
        await client.leave();
      } catch {
        // Ignore cleanup errors when the client is already torn down.
      }
    }

    clientRef.current = null;
    sessionRef.current = null;
  }, [stopPlayback]);

  const speakAssistantResponse = useCallback(
    async (content: string) => {
      const text = content.trim();
      const activeSessionToken = sessionTokenRef.current;

      if (!text || activeSessionToken === 0) {
        return;
      }

      stopPlayback();
      setError(null);
      setStatus("speaking");

      try {
        const response = await fetch("/api/voice/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (sessionTokenRef.current !== activeSessionToken) {
          return;
        }

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        const audioBlob = await response.blob();
        if (sessionTokenRef.current !== activeSessionToken) {
          return;
        }

        const playbackUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(playbackUrl);
        playbackAudioRef.current = audio;
        playbackUrlRef.current = playbackUrl;

        audio.onended = () => {
          if (playbackAudioRef.current === audio) {
            playbackAudioRef.current = null;
          }
          if (playbackUrlRef.current === playbackUrl) {
            playbackUrlRef.current = null;
            URL.revokeObjectURL(playbackUrl);
          }
          if (sessionTokenRef.current === activeSessionToken) {
            setStatus("live");
          }
        };

        audio.onerror = () => {
          if (playbackAudioRef.current === audio) {
            playbackAudioRef.current = null;
          }
          if (playbackUrlRef.current === playbackUrl) {
            playbackUrlRef.current = null;
            URL.revokeObjectURL(playbackUrl);
          }
          if (sessionTokenRef.current === activeSessionToken) {
            setError("Assistant audio could not be played.");
            setStatus("live");
          }
        };

        await audio.play();
      } catch (err) {
        if (sessionTokenRef.current !== activeSessionToken) {
          return;
        }

        setError(err instanceof Error ? err.message : "Assistant audio could not be played.");
        setStatus("live");
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const processRecordedTurn = useCallback(
    async (blob: Blob, sessionToken: number) => {
      if (sessionTokenRef.current !== sessionToken || sessionToken === 0) {
        return;
      }

      if (blob.size === 0) {
        setStatus("live");
        return;
      }

      setError(null);
      setStatus("transcribing");

      try {
        const formData = new FormData();
        formData.append("file", blob, "voice-turn.webm");
        formData.append("language", "en");

        const transcriptionResponse = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        });

        if (sessionTokenRef.current !== sessionToken) {
          return;
        }

        if (!transcriptionResponse.ok) {
          throw new Error(await readErrorMessage(transcriptionResponse));
        }

        const payload = (await transcriptionResponse.json()) as VoiceTranscribeResponse;
        const transcript = payload.text.trim();

        if (!transcript) {
          setStatus("live");
          return;
        }

        setStatus("transcribing");
        const response = await onSpokenTurn(transcript);

        if (sessionTokenRef.current !== sessionToken) {
          return;
        }

        if (response.content.trim()) {
          await speakAssistantResponse(response.content);
        } else {
          setStatus("live");
        }
      } catch (err) {
        if (sessionTokenRef.current !== sessionToken) {
          return;
        }

        setError(err instanceof Error ? err.message : "Speech turn failed.");
        setStatus("live");
      }
    },
    [onSpokenTurn, speakAssistantResponse],
  );

  const toggleRecording = useCallback(() => {
    const activeSessionToken = sessionTokenRef.current;
    const recorder = recordingRef.current;

    if (status === "recording" && recorder && recorder.state !== "inactive") {
      setStatus("transcribing");
      try {
        recorder.stop();
      } catch {
        setStatus("live");
      }
      return;
    }

    if (status !== "live" || isMuted) {
      return;
    }

    const stream = mediaStreamRef.current;
    if (!stream) {
      setError("Microphone is not ready yet.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Your browser does not support voice recording.");
      return;
    }

    const mimeType = pickRecorderMimeType();
    turnBufferRef.current = [];
    turnRecorderMimeTypeRef.current = mimeType;

    const nextRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    nextRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        turnBufferRef.current.push(event.data);
      }
    };

    nextRecorder.onerror = () => {
      if (sessionTokenRef.current !== activeSessionToken) {
        return;
      }

      setError("Could not record microphone audio.");
      setStatus("live");
      recordingRef.current = null;
    };

    nextRecorder.onstop = () => {
      recordingRef.current = null;
      const turnBlob = new Blob(turnBufferRef.current, {
        type: turnRecorderMimeTypeRef.current ?? "audio/webm",
      });
      turnBufferRef.current = [];
      turnRecorderMimeTypeRef.current = undefined;
      void processRecordedTurn(turnBlob, activeSessionToken);
    };

    recordingRef.current = nextRecorder;
    setError(null);
    setStatus("recording");
    nextRecorder.start();
  }, [isMuted, processRecordedTurn, status]);

  const toggleMute = useCallback(async () => {
    const localTrack = localTrackRef.current;
    const stream = mediaStreamRef.current;

    if (!localTrack || status === "idle" || status === "error") {
      return;
    }

    const nextMuted = !isMuted;
    await localTrack.setMuted(nextMuted);
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted, status]);

  const stopVoice = useCallback(async () => {
    sessionTokenRef.current = 0;
    sessionRef.current = null;

    try {
      const recorder = recordingRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      recordingRef.current = null;
      await cleanupRtc();
      setStatus("idle");
      setError(null);
      setIsMuted(false);
    } catch (err) {
      await cleanupRtc();
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Failed to stop voice room.");
      setIsMuted(false);
    }
  }, [cleanupRtc]);

  useEffect(() => {
    return () => {
      void stopVoice();
    };
  }, [stopVoice]);

  const startVoice = useCallback(async () => {
    if (status !== "idle" && status !== "error") {
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      const prepareResponse = await fetch("/api/agora/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inventionId }),
      });

      const preparePayload = await prepareResponse.json();
      if (!prepareResponse.ok) {
        throw new Error(preparePayload.error ?? "Agora RTC session failed to start.");
      }

      const session = preparePayload as {
        appId: string;
        channelName: string;
        token: string;
        userRtcUid: number;
      };

      const rtcModule = (await import("agora-rtc-sdk-ng")) as { default: IAgoraRTC };
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = mediaStream.getAudioTracks()[0];

      if (!audioTrack) {
        throw new Error("Microphone access is required for voice mode.");
      }

      const client = rtcModule.default.createClient({ mode: "rtc", codec: "vp8" });
      const localTrack = rtcModule.default.createCustomAudioTrack({ mediaStreamTrack: audioTrack });

      clientRef.current = client;
      localTrackRef.current = localTrack;
      mediaStreamRef.current = mediaStream;

      await client.join(session.appId, session.channelName, session.token, session.userRtcUid);
      await client.publish([localTrack]);

      audioTrack.enabled = !isMuted;
      await localTrack.setMuted(isMuted);

      sessionRef.current = {
        channelName: session.channelName,
        userRtcUid: session.userRtcUid,
      };
      sessionTokenRef.current = ++sessionCounterRef.current;
      setStatus("live");
    } catch (err) {
      await cleanupRtc();
      sessionTokenRef.current = 0;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Agora voice failed to start.");
      setIsMuted(false);
    }
  }, [cleanupRtc, inventionId, isMuted, status]);

  return {
    error,
    isActive: status !== "idle" && status !== "error",
    isConnecting: status === "connecting",
    isRecording: status === "recording",
    isMuted,
    isSpeaking: status === "speaking",
    speakAssistantResponse,
    startVoice,
    status,
    toggleMute,
    toggleRecording,
    stopVoice,
  };
}
