import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ViewerControls } from "@/components/viewer/ViewerControls";

describe("ViewerControls", () => {
  it("shows the gesture preview panel and blocked state when camera access fails", () => {
    render(
      <ViewerControls
        gestureEnabled
        gestureError="Camera access was blocked."
        gestureStatus="blocked"
        gestureVideoRef={createRef<HTMLVideoElement>()}
        gestureDebugFrame={null}
        isExploded={false}
        onToggleGestures={vi.fn()}
        onToggleExplode={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Gesture Control")).toBeTruthy();
    expect(screen.getByText("Camera blocked")).toBeTruthy();
    expect(screen.getByText(/Link:.*CAMERA BLOCKED/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enable Gestures/i })).toBeTruthy();
  });

  it("renders unsupported status without showing the preview panel when gestures are off", () => {
    render(
      <ViewerControls
        gestureEnabled={false}
        gestureError="This browser does not support webcam gesture controls."
        gestureStatus="unsupported"
        gestureVideoRef={createRef<HTMLVideoElement>()}
        gestureDebugFrame={null}
        isExploded
        onToggleGestures={vi.fn()}
        onToggleExplode={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText(/Link:.*UNSUPPORTED/i)).toBeTruthy();
    expect(screen.queryByText("Gesture Control")).toBeNull();
    expect(screen.getByRole("button", { name: /Enable Gestures/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Assemble/i })).toBeTruthy();
  });

  it("forwards reset and explode interactions", () => {
    const onReset = vi.fn();
    const onToggleExplode = vi.fn();

    render(
      <ViewerControls
        gestureEnabled={false}
        gestureError={null}
        gestureStatus="idle"
        gestureVideoRef={createRef<HTMLVideoElement>()}
        gestureDebugFrame={null}
        isExploded={false}
        onToggleGestures={vi.fn()}
        onToggleExplode={onToggleExplode}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Explode/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

    expect(onToggleExplode).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders gesture debugging metadata when a frame is available", () => {
    render(
      <ViewerControls
        gestureEnabled
        gestureError={null}
        gestureStatus="tracking"
        gestureVideoRef={createRef<HTMLVideoElement>()}
        gestureDebugFrame={{
          bounds: { minX: 0.2, minY: 0.15, maxX: 0.6, maxY: 0.75 },
          confidence: 0.93,
          graceFramesRemaining: 0,
          isStable: true,
          isWithinGraceWindow: false,
          palmCenter: { x: 0.4, y: 0.5 },
          gestureName: "Open_Palm",
        }}
        isExploded={false}
        onToggleGestures={vi.fn()}
        onToggleExplode={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("OPEN PALM")).toBeTruthy();
    expect(screen.getByText("LOCK - STABLE")).toBeTruthy();
  });
});
