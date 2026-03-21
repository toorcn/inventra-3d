"use client";

import type { ChatResponse, VoiceTranscribeResponse } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "speaking" | "error";

interface UseVoiceSessionProps {
  onSpokenTurn: (content: string) => Promise<ChatResponse>;
}

type RecordedTurn = {
  token: number;
  blob: Blob;
};

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
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

export function useVoiceSession({ onSpokenTurn }: UseVoiceSessionProps) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const sessionTokenRef = useRef(0);
  const sessionCounterRef = useRef(0);
  const turnBufferRef = useRef<BlobPart[]>([]);
  const turnRecorderMimeTypeRef = useRef<string | undefined>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");

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

  const cleanupMedia = useCallback(() => {
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

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    turnBufferRef.current = [];
    turnRecorderMimeTypeRef.current = undefined;
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
            setStatus("idle");
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
            setStatus("idle");
          }
        };

        await audio.play();
      } catch (err) {
        if (sessionTokenRef.current !== activeSessionToken) {
          return;
        }

        setError(err instanceof Error ? err.message : "Assistant audio could not be played.");
        setStatus("idle");
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const processRecordedTurn = useCallback(
    async ({ blob, token }: RecordedTurn) => {
      if (sessionTokenRef.current !== token || token === 0) {
        return;
      }

      if (blob.size === 0) {
        setStatus("idle");
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

        if (sessionTokenRef.current !== token) {
          return;
        }

        if (!transcriptionResponse.ok) {
          throw new Error(await readErrorMessage(transcriptionResponse));
        }

        const payload = (await transcriptionResponse.json()) as VoiceTranscribeResponse;
        const transcript = payload.text.trim();

        if (!transcript) {
          setStatus("idle");
          return;
        }

        const response = await onSpokenTurn(transcript);

        if (sessionTokenRef.current !== token) {
          return;
        }

        if (response.content.trim()) {
          await speakAssistantResponse(response.content);
          return;
        }

        setStatus("idle");
      } catch (err) {
        if (sessionTokenRef.current !== token) {
          return;
        }

        setError(err instanceof Error ? err.message : "Speech turn failed.");
        setStatus("idle");
      }
    },
    [onSpokenTurn, speakAssistantResponse],
  );

  const toggleRecording = useCallback(async () => {
    const recorder = recordingRef.current;

    if (status === "recording" && recorder && recorder.state !== "inactive") {
      setStatus("transcribing");
      try {
        recorder.stop();
      } catch {
        setStatus("idle");
      }
      return;
    }

    if (status === "transcribing" || status === "speaking") {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Your browser does not support voice recording.");
      setStatus("error");
      return;
    }

    try {
      let stream = mediaStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("Microphone access is required for voice mode.");
      }

      const mimeType = pickRecorderMimeType();
      turnBufferRef.current = [];
      turnRecorderMimeTypeRef.current = mimeType;

      const nextRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const activeSessionToken = ++sessionCounterRef.current;
      sessionTokenRef.current = activeSessionToken;

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
        setStatus("idle");
        recordingRef.current = null;
      };

      nextRecorder.onstop = () => {
        recordingRef.current = null;
        const turnBlob = new Blob(turnBufferRef.current, {
          type: turnRecorderMimeTypeRef.current ?? "audio/webm",
        });
        turnBufferRef.current = [];
        turnRecorderMimeTypeRef.current = undefined;
        void processRecordedTurn({ blob: turnBlob, token: activeSessionToken });
      };

      recordingRef.current = nextRecorder;
      setError(null);
      setStatus("recording");
      nextRecorder.start();
    } catch (err) {
      cleanupMedia();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Voice recording failed to start.");
    }
  }, [cleanupMedia, processRecordedTurn, status]);

  const stopVoice = useCallback(() => {
    sessionTokenRef.current = 0;
    cleanupMedia();
    setStatus("idle");
    setError(null);
  }, [cleanupMedia]);

  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  return {
    error,
    isRecording: status === "recording",
    isSpeaking: status === "speaking",
    speakAssistantResponse,
    status,
    stopVoice,
    toggleRecording,
  };
}
