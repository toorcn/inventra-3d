"use client";

import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  DEFAULT_GESTURE_FRAME_STATE,
  GESTURE_FRAME_INTERVAL_MS,
  advanceGestureFrame,
  getDominantGesture,
  getPalmCenter,
} from "@/lib/gesture-controls";
import type { GestureControlStatus } from "@/types";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

interface UseGestureControlsOptions {
  enabled: boolean;
  onAssemble: () => void;
  onExplode: () => void;
  onRotate: (delta: { x: number; y: number }) => void;
}

interface UseGestureControlsReturn {
  error: string | null;
  status: GestureControlStatus;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
}

const MEDIAPIPE_IGNORED_CONSOLE_MESSAGES = [
  "Created TensorFlow Lite XNNPACK delegate for CPU.",
];

function isPermissionError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === "NotAllowedError" || error.name === "SecurityError";
  }

  return false;
}

function matchesIgnoredGestureConsoleMessage(args: unknown[]) {
  return args.some((arg) => {
    if (typeof arg === "string") {
      return MEDIAPIPE_IGNORED_CONSOLE_MESSAGES.some((message) => arg.includes(message));
    }

    if (arg instanceof Error) {
      return MEDIAPIPE_IGNORED_CONSOLE_MESSAGES.some((message) => arg.message.includes(message));
    }

    return false;
  });
}

async function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleLoadedData = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Gesture video preview failed to initialize."));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
    };

    video.addEventListener("loadeddata", handleLoadedData, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

export function useGestureControls({
  enabled,
  onAssemble,
  onExplode,
  onRotate,
}: UseGestureControlsOptions): UseGestureControlsReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameStateRef = useRef(DEFAULT_GESTURE_FRAME_STATE);
  const rafRef = useRef<number | null>(null);
  const lastInferenceAtRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const onAssembleRef = useRef(onAssemble);
  const onExplodeRef = useRef(onExplode);
  const onRotateRef = useRef(onRotate);
  const sessionIdRef = useRef(0);
  const restoreConsoleErrorRef = useRef<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GestureControlStatus>("idle");

  useEffect(() => {
    onAssembleRef.current = onAssemble;
  }, [onAssemble]);

  useEffect(() => {
    onExplodeRef.current = onExplode;
  }, [onExplode]);

  useEffect(() => {
    onRotateRef.current = onRotate;
  }, [onRotate]);

  useEffect(() => {
    const installGestureConsoleFilter = () => {
      if (restoreConsoleErrorRef.current) {
        return;
      }

      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        if (matchesIgnoredGestureConsoleMessage(args)) {
          return;
        }

        originalConsoleError(...args);
      };

      restoreConsoleErrorRef.current = () => {
        console.error = originalConsoleError;
        restoreConsoleErrorRef.current = null;
      };
    };

    const stopSession = async (nextStatus: GestureControlStatus) => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      frameStateRef.current = DEFAULT_GESTURE_FRAME_STATE;
      lastInferenceAtRef.current = 0;
      lastVideoTimeRef.current = -1;
      restoreConsoleErrorRef.current?.();
      setStatus(nextStatus);
    };

    if (!enabled) {
      void stopSession("idle");
      setError(null);
      return;
    }

    const hasMediaSupport =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    if (!hasMediaSupport) {
      setError("This browser does not support webcam gesture controls.");
      setStatus("unsupported");
      return;
    }

    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    let cancelled = false;

    const processFrame = () => {
      if (
        cancelled ||
        sessionIdRef.current !== sessionId ||
        !recognizerRef.current ||
        !videoRef.current
      ) {
        return;
      }

      try {
        const video = videoRef.current;
        const now = performance.now();
        const shouldInfer =
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.currentTime !== lastVideoTimeRef.current &&
          now - lastInferenceAtRef.current >= GESTURE_FRAME_INTERVAL_MS;

        if (shouldInfer) {
          const result = recognizerRef.current.recognizeForVideo(video, now);
          const topGesture = getDominantGesture(result.gestures[0]);
          const palmCenter = getPalmCenter(result.landmarks[0]);
          const frame = advanceGestureFrame(frameStateRef.current, {
            gestureName: topGesture?.name ?? null,
            gestureScore: topGesture?.score ?? 0,
            palmCenter,
            timestampMs: now,
          });

          frameStateRef.current = frame.state;
          lastInferenceAtRef.current = now;
          lastVideoTimeRef.current = video.currentTime;

          if (frame.command === "explode") {
            onExplodeRef.current();
          } else if (frame.command === "assemble") {
            onAssembleRef.current();
          }

          if (frame.rotationDelta) {
            onRotateRef.current(frame.rotationDelta);
          }
        }

        rafRef.current = window.requestAnimationFrame(processFrame);
      } catch (loopError) {
        const message =
          loopError instanceof Error
            ? loopError.message
            : "Gesture recognition failed while processing the camera stream.";
        setError(message);
        void stopSession("error");
      }
    };

    const startSession = async () => {
      setError(null);
      setStatus("starting");

      try {
        const video = videoRef.current;
        if (!video) {
          throw new Error("Gesture preview is unavailable.");
        }

        installGestureConsoleFilter();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            height: { ideal: 480 },
            width: { ideal: 640 },
          },
        });

        if (cancelled || sessionIdRef.current !== sessionId) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await waitForVideoReady(video);
        await video.play();

        const { FilesetResolver, GestureRecognizer } = await import(
          "@mediapipe/tasks-vision"
        );

        if (cancelled || sessionIdRef.current !== sessionId) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const vision = await FilesetResolver.forVisionTasks("/mediapipe");
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/gesture_recognizer.task",
          },
          cannedGesturesClassifierOptions: {
            categoryAllowlist: ["Open_Palm", "Thumb_Down", "Thumb_Up"],
            maxResults: 1,
            scoreThreshold: 0.7,
          },
          numHands: 1,
          runningMode: "VIDEO",
        });

        if (cancelled || sessionIdRef.current !== sessionId) {
          recognizer.close();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        recognizerRef.current = recognizer;
        frameStateRef.current = DEFAULT_GESTURE_FRAME_STATE;
        setStatus("tracking");
        processFrame();
      } catch (startError) {
        if (cancelled || sessionIdRef.current !== sessionId) {
          return;
        }

        const message = isPermissionError(startError)
          ? "Camera access was blocked. Allow webcam access to use gesture controls."
          : startError instanceof Error
            ? startError.message
            : "Gesture controls failed to start.";

        setError(message);
        await stopSession(isPermissionError(startError) ? "blocked" : "error");
      }
    };

    void startSession();

    return () => {
      cancelled = true;
      void stopSession("idle");
    };
  }, [enabled]);

  return {
    error,
    status,
    videoRef,
  };
}
