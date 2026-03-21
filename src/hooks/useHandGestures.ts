"use client";

import { useEffect, useRef, useState } from "react";

export type GestureType =
  | "palm_open"
  | "fist"
  | "point"
  | "pinch_open"
  | "pinch_close"
  | "none";

export interface HandGestureState {
  gesture: GestureType;
  confidence: number;
  wristDeltaX: number;   // delta of wrist landmark x between frames (for rotation)
  pinchDistance: number; // delta of distance between indexTip(8) and thumbTip(4) (for scaling)
}

const DEFAULT_STATE: HandGestureState = {
  gesture: "none",
  confidence: 0,
  wristDeltaX: 0,
  pinchDistance: 0,
};

// Landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_BASE = 6;
const MIDDLE_TIP = 12;
const MIDDLE_BASE = 10;
const RING_TIP = 16;
const RING_BASE = 14;
const PINKY_TIP = 20;
const PINKY_BASE = 18;

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

function classifyGesture(landmarks: Landmark[]): { gesture: GestureType; confidence: number } {
  if (!landmarks || landmarks.length < 21) return { gesture: "none", confidence: 0 };

  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_BASE].y;
  const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_BASE].y;
  const ringExtended = landmarks[RING_TIP].y < landmarks[RING_BASE].y;
  const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_BASE].y;

  const allExtended = indexExtended && middleExtended && ringExtended && pinkyExtended;
  const noneExtended = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  const onlyIndexExtended = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

  // Pinch: distance between thumb tip and index tip
  const dx = landmarks[INDEX_TIP].x - landmarks[THUMB_TIP].x;
  const dy = landmarks[INDEX_TIP].y - landmarks[THUMB_TIP].y;
  const pinchDist = Math.sqrt(dx * dx + dy * dy);

  if (allExtended) {
    return { gesture: "palm_open", confidence: 0.9 };
  }
  if (noneExtended) {
    return { gesture: "fist", confidence: 0.9 };
  }
  if (onlyIndexExtended) {
    return { gesture: "point", confidence: 0.85 };
  }
  if (pinchDist < 0.05) {
    return { gesture: "pinch_close", confidence: 0.8 };
  }
  if (pinchDist < 0.12) {
    return { gesture: "pinch_open", confidence: 0.7 };
  }

  return { gesture: "none", confidence: 0 };
}

export function useHandGestures(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean = true
): HandGestureState {
  const [gestureState, setGestureState] = useState<HandGestureState>(DEFAULT_STATE);

  // 3-frame debounce state
  const pendingGestureRef = useRef<GestureType>("none");
  const pendingCountRef = useRef<number>(0);
  const confirmedGestureRef = useRef<GestureType>("none");

  // Previous frame values for delta calculations
  const prevWristXRef = useRef<number | null>(null);
  const prevPinchDistRef = useRef<number | null>(null);

  // MediaPipe instance refs for cleanup
  const handsRef = useRef<unknown>(null);
  const cameraRef = useRef<unknown>(null);

  useEffect(() => {
    if (!enabled) {
      setGestureState(DEFAULT_STATE);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        // Dynamic imports to avoid SSR issues
        const [{ Hands }, { Camera }] = await Promise.all([
          import("@mediapipe/hands"),
          import("@mediapipe/camera_utils"),
        ]);

        if (cancelled) return;

        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: { multiHandLandmarks?: Landmark[][] }) => {
          if (cancelled) return;

          const landmarks =
            results.multiHandLandmarks && results.multiHandLandmarks.length > 0
              ? results.multiHandLandmarks[0]
              : null;

          if (!landmarks) {
            // No hand detected — reset debounce
            pendingGestureRef.current = "none";
            pendingCountRef.current = 0;
            prevWristXRef.current = null;
            prevPinchDistRef.current = null;
            confirmedGestureRef.current = "none";
            setGestureState(DEFAULT_STATE);
            return;
          }

          // Classify gesture for this frame
          const { gesture: rawGesture, confidence } = classifyGesture(landmarks);

          // 3-frame debounce
          if (rawGesture === pendingGestureRef.current) {
            pendingCountRef.current += 1;
          } else {
            pendingGestureRef.current = rawGesture;
            pendingCountRef.current = 1;
          }

          const confirmedGesture =
            pendingCountRef.current >= 3 ? rawGesture : confirmedGestureRef.current;

          if (pendingCountRef.current >= 3) {
            confirmedGestureRef.current = confirmedGesture;
          }

          // Wrist delta X
          const wristX = landmarks[WRIST].x;
          const wristDeltaX =
            prevWristXRef.current !== null ? wristX - prevWristXRef.current : 0;
          prevWristXRef.current = wristX;

          // Pinch distance delta
          const dx = landmarks[INDEX_TIP].x - landmarks[THUMB_TIP].x;
          const dy = landmarks[INDEX_TIP].y - landmarks[THUMB_TIP].y;
          const currentPinchDist = Math.sqrt(dx * dx + dy * dy);
          const pinchDistance =
            prevPinchDistRef.current !== null
              ? currentPinchDist - prevPinchDistRef.current
              : 0;
          prevPinchDistRef.current = currentPinchDist;

          setGestureState({
            gesture: confirmedGesture,
            confidence: pendingCountRef.current >= 3 ? confidence : 0,
            wristDeltaX,
            pinchDistance,
          });
        });

        handsRef.current = hands;

        const videoEl = videoRef.current;
        if (!videoEl) return;

        const camera = new Camera(videoEl, {
          onFrame: async () => {
            if (!cancelled && handsRef.current) {
              await (handsRef.current as { send: (opts: { image: HTMLVideoElement }) => Promise<void> }).send({ image: videoEl });
            }
          },
          width: 1280,
          height: 720,
        });

        cameraRef.current = camera;
        camera.start();
      } catch (err) {
        // MediaPipe failed to load — silently degrade
        console.warn("[useHandGestures] MediaPipe load failed:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      // Stop camera
      if (cameraRef.current) {
        try {
          (cameraRef.current as { stop: () => void }).stop();
        } catch (_) {
          // ignore
        }
        cameraRef.current = null;
      }
      // Close hands
      if (handsRef.current) {
        try {
          (handsRef.current as { close: () => void }).close();
        } catch (_) {
          // ignore
        }
        handsRef.current = null;
      }
      prevWristXRef.current = null;
      prevPinchDistRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return gestureState;
}
