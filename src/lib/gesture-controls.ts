import type { GestureDebugBounds, ViewerTransform } from "@/types";

export const GESTURE_MIN_CONFIDENCE = 0.7;
export const GESTURE_STABLE_FRAME_COUNT = 2;
export const GESTURE_CONTINUOUS_GRACE_FRAME_COUNT = 5;
export const GESTURE_COMMAND_COOLDOWN_MS = 1200;
export const GESTURE_FRAME_INTERVAL_MS = Math.round(1000 / 12);
export const VIEWER_ROTATION_SMOOTHING = 0.35;
export const VIEWER_ROTATION_SENSITIVITY = 6;
export const VIEWER_PITCH_LIMIT = 0.9;

export const DEFAULT_VIEWER_TRANSFORM: ViewerTransform = {
  rotationX: 0,
  rotationY: 0,
};

export type GestureCommand = "explode" | "assemble";

export interface GestureCategoryLike {
  categoryName?: string;
  score?: number;
}

export interface PalmPoint {
  x: number;
  y: number;
}

export interface GestureFrameInput {
  gestureName: string | null;
  gestureScore: number;
  palmCenter: PalmPoint | null;
  timestampMs: number;
}

export interface GestureFrameState {
  currentGestureName: string | null;
  consecutiveFrames: number;
  missedFrames: number;
  previousPalmCenter: PalmPoint | null;
  lastCommandAt: number | null;
  discreteGestureConsumed: boolean;
}

export interface GestureFrameOutput {
  command: GestureCommand | null;
  rotationDelta: PalmPoint | null;
  stableGestureName: string | null;
  state: GestureFrameState;
}

export const DEFAULT_GESTURE_FRAME_STATE: GestureFrameState = {
  currentGestureName: null,
  consecutiveFrames: 0,
  missedFrames: 0,
  previousPalmCenter: null,
  lastCommandAt: null,
  discreteGestureConsumed: false,
};

const PALM_CENTER_INDICES = [0, 5, 9, 13, 17] as const;

function isDiscreteGesture(name: string | null): name is "Thumb_Up" | "Thumb_Down" {
  return name === "Thumb_Up" || name === "Thumb_Down";
}

function toCommand(name: "Thumb_Up" | "Thumb_Down"): GestureCommand {
  return name === "Thumb_Up" ? "explode" : "assemble";
}

export function clampViewerPitch(rotationX: number) {
  return Math.max(-VIEWER_PITCH_LIMIT, Math.min(VIEWER_PITCH_LIMIT, rotationX));
}

export function getDominantGesture(
  gestures: GestureCategoryLike[] | null | undefined,
): { name: string; score: number } | null {
  if (!gestures || gestures.length === 0) return null;

  let best: { name: string; score: number } | null = null;

  gestures.forEach((gesture) => {
    if (!gesture.categoryName) return;
    const score = gesture.score ?? 0;
    if (!best || score > best.score) {
      best = {
        name: gesture.categoryName,
        score,
      };
    }
  });

  return best;
}

export function getPalmCenter(
  landmarks: Array<{ x: number; y: number }> | null | undefined,
): PalmPoint | null {
  if (!landmarks) return null;

  const relevant = PALM_CENTER_INDICES.map((index) => landmarks[index]).filter(Boolean);
  if (relevant.length !== PALM_CENTER_INDICES.length) return null;

  const total = relevant.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / relevant.length,
    y: total.y / relevant.length,
  };
}

export function getHandBounds(
  landmarks: Array<{ x: number; y: number }> | null | undefined,
): GestureDebugBounds | null {
  if (!landmarks || landmarks.length === 0) return null;

  const firstPoint = landmarks[0];
  if (!firstPoint) return null;

  return landmarks.reduce<GestureDebugBounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: firstPoint.x,
      minY: firstPoint.y,
      maxX: firstPoint.x,
      maxY: firstPoint.y,
    },
  );
}

export function advanceGestureFrame(
  state: GestureFrameState,
  input: GestureFrameInput,
  options?: {
    cooldownMs?: number;
    continuousGraceFrameCount?: number;
    minConfidence?: number;
    stableFrameCount?: number;
  },
): GestureFrameOutput {
  const cooldownMs = options?.cooldownMs ?? GESTURE_COMMAND_COOLDOWN_MS;
  const continuousGraceFrameCount =
    options?.continuousGraceFrameCount ?? GESTURE_CONTINUOUS_GRACE_FRAME_COUNT;
  const minConfidence = options?.minConfidence ?? GESTURE_MIN_CONFIDENCE;
  const stableFrameCount = options?.stableFrameCount ?? GESTURE_STABLE_FRAME_COUNT;

  const isConfident =
    Boolean(input.gestureName) && input.gestureScore >= minConfidence;
  const withinOpenPalmGraceWindow =
    !isConfident &&
    state.currentGestureName === "Open_Palm" &&
    state.missedFrames < continuousGraceFrameCount;
  const nextGestureName = isConfident
    ? input.gestureName
    : withinOpenPalmGraceWindow
      ? state.currentGestureName
      : null;
  const nextConsecutiveFrames =
    nextGestureName && nextGestureName === state.currentGestureName
      ? state.consecutiveFrames + 1
      : nextGestureName
        ? 1
        : 0;
  const nextMissedFrames =
    isConfident
      ? 0
      : nextGestureName === "Open_Palm"
        ? state.missedFrames + 1
        : 0;

  const stableGestureName =
    nextGestureName && nextConsecutiveFrames >= stableFrameCount
      ? nextGestureName
      : null;

  const nextState: GestureFrameState = {
    currentGestureName: nextGestureName,
    consecutiveFrames: nextConsecutiveFrames,
    missedFrames: nextMissedFrames,
    previousPalmCenter:
      stableGestureName === "Open_Palm"
        ? input.palmCenter ?? state.previousPalmCenter
        : null,
    lastCommandAt: state.lastCommandAt,
    discreteGestureConsumed:
      nextGestureName === state.currentGestureName
        ? state.discreteGestureConsumed
        : false,
  };

  let rotationDelta: PalmPoint | null = null;
  if (stableGestureName === "Open_Palm" && state.previousPalmCenter && input.palmCenter) {
    rotationDelta = {
      x: input.palmCenter.x - state.previousPalmCenter.x,
      y: input.palmCenter.y - state.previousPalmCenter.y,
    };
  }

  let command: GestureCommand | null = null;
  if (stableGestureName && isDiscreteGesture(stableGestureName)) {
    const canFire =
      !nextState.discreteGestureConsumed &&
      (nextState.lastCommandAt === null ||
        input.timestampMs - nextState.lastCommandAt >= cooldownMs);

    if (canFire) {
      command = toCommand(stableGestureName);
      nextState.lastCommandAt = input.timestampMs;
      nextState.discreteGestureConsumed = true;
      nextState.previousPalmCenter = null;
    }
  }

  return {
    command,
    rotationDelta,
    stableGestureName,
    state: nextState,
  };
}

export function applySmoothedRotation(
  transform: ViewerTransform,
  delta: PalmPoint,
  options?: {
    sensitivity?: number;
    smoothing?: number;
  },
): ViewerTransform {
  const sensitivity = options?.sensitivity ?? VIEWER_ROTATION_SENSITIVITY;
  const smoothing = options?.smoothing ?? VIEWER_ROTATION_SMOOTHING;
  const yawStep = delta.x * sensitivity * smoothing;
  const pitchStep = delta.y * sensitivity * smoothing;

  return {
    rotationX: clampViewerPitch(transform.rotationX + pitchStep),
    rotationY: transform.rotationY - yawStep,
  };
}
