import { describe, expect, it } from "vitest";
import {
  DEFAULT_GESTURE_FRAME_STATE,
  DEFAULT_VIEWER_TRANSFORM,
  advanceGestureFrame,
  applySmoothedRotation,
  getDominantGesture,
  getPalmCenter,
} from "@/lib/gesture-controls";

function createPalm(x: number, y: number) {
  return Array.from({ length: 21 }, () => ({ x: 0, y: 0 })).map((point, index) => {
    if ([0, 5, 9, 13, 17].includes(index)) {
      return { x, y };
    }

    return point;
  });
}

describe("gesture-controls", () => {
  it("picks the highest-scoring gesture category", () => {
    const dominant = getDominantGesture([
      { categoryName: "Open_Palm", score: 0.62 },
      { categoryName: "Thumb_Up", score: 0.91 },
    ]);

    expect(dominant).toEqual({
      name: "Thumb_Up",
      score: 0.91,
    });
  });

  it("computes a stabilized palm center from palm landmarks", () => {
    const center = getPalmCenter(createPalm(0.35, 0.45));

    expect(center).toEqual({ x: 0.35, y: 0.45 });
  });

  it("waits for a stable open palm before emitting rotation deltas", () => {
    let state = DEFAULT_GESTURE_FRAME_STATE;

    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.2, y: 0.3 },
      timestampMs: 0,
    }).state;

    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.22, y: 0.31 },
      timestampMs: 80,
    }).state;

    const thirdFrame = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.24, y: 0.34 },
      timestampMs: 160,
    });

    expect(thirdFrame.stableGestureName).toBe("Open_Palm");
    expect(thirdFrame.rotationDelta).toBeNull();

    const fourthFrame = advanceGestureFrame(thirdFrame.state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.29, y: 0.4 },
      timestampMs: 240,
    });

    expect(fourthFrame.rotationDelta?.x).toBeCloseTo(0.05, 5);
    expect(fourthFrame.rotationDelta?.y).toBeCloseTo(0.06, 5);
  });

  it("keeps open palm tracking active through brief recognition dropouts", () => {
    let state = DEFAULT_GESTURE_FRAME_STATE;

    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.2, y: 0.3 },
      timestampMs: 0,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.22, y: 0.31 },
      timestampMs: 80,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.24, y: 0.34 },
      timestampMs: 160,
    }).state;

    const missedFrame = advanceGestureFrame(state, {
      gestureName: null,
      gestureScore: 0,
      palmCenter: null,
      timestampMs: 240,
    });

    expect(missedFrame.stableGestureName).toBe("Open_Palm");
    expect(missedFrame.state.currentGestureName).toBe("Open_Palm");
    expect(missedFrame.state.previousPalmCenter).toEqual({ x: 0.24, y: 0.34 });

    const recoveredFrame = advanceGestureFrame(missedFrame.state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.29, y: 0.4 },
      timestampMs: 320,
    });

    expect(recoveredFrame.rotationDelta?.x).toBeCloseTo(0.05, 5);
    expect(recoveredFrame.rotationDelta?.y).toBeCloseTo(0.06, 5);
  });

  it("resets open palm tracking after the grace window is exceeded", () => {
    let state = DEFAULT_GESTURE_FRAME_STATE;

    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.2, y: 0.3 },
      timestampMs: 0,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.22, y: 0.31 },
      timestampMs: 80,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Open_Palm",
      gestureScore: 0.92,
      palmCenter: { x: 0.24, y: 0.34 },
      timestampMs: 160,
    }).state;

    state = advanceGestureFrame(state, {
      gestureName: null,
      gestureScore: 0,
      palmCenter: null,
      timestampMs: 240,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: null,
      gestureScore: 0,
      palmCenter: null,
      timestampMs: 320,
    }).state;

    const expiredFrame = advanceGestureFrame(state, {
      gestureName: null,
      gestureScore: 0,
      palmCenter: null,
      timestampMs: 400,
    });

    expect(expiredFrame.stableGestureName).toBeNull();
    expect(expiredFrame.state.currentGestureName).toBeNull();
    expect(expiredFrame.state.previousPalmCenter).toBeNull();
  });

  it("enforces one discrete command per gesture streak and cooldown window", () => {
    let state = DEFAULT_GESTURE_FRAME_STATE;

    state = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 0,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 80,
    }).state;

    const firstCommand = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 160,
    });

    expect(firstCommand.command).toBe("explode");

    const heldGesture = advanceGestureFrame(firstCommand.state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 1360,
    });

    expect(heldGesture.command).toBeNull();

    state = advanceGestureFrame(heldGesture.state, {
      gestureName: null,
      gestureScore: 0,
      palmCenter: null,
      timestampMs: 1440,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 1520,
    }).state;
    state = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 1600,
    }).state;

    const secondCommand = advanceGestureFrame(state, {
      gestureName: "Thumb_Up",
      gestureScore: 0.95,
      palmCenter: null,
      timestampMs: 1680,
    });

    expect(secondCommand.command).toBe("explode");
  });

  it("smooths viewer rotation deltas and clamps pitch", () => {
    const rotated = applySmoothedRotation(DEFAULT_VIEWER_TRANSFORM, {
      x: 0.5,
      y: -0.5,
    });

    expect(rotated.rotationY).toBeCloseTo(-1.05, 5);
    expect(rotated.rotationX).toBeCloseTo(-0.9, 5);

    const clamped = applySmoothedRotation(
      {
        rotationX: 0.85,
        rotationY: 0,
      },
      { x: 0, y: -1 },
    );

    expect(clamped.rotationX).toBe(-0.9);
  });
});
