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
        isExploded={false}
        onToggleGestures={vi.fn()}
        onToggleExplode={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Camera blocked")).toHaveLength(2);
    expect(screen.getByText(/Open palm rotates/i)).toBeTruthy();
    expect(screen.getByText(/Camera access was blocked/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Disable Gestures/i })).toBeTruthy();
  });

  it("renders unsupported status without showing the preview panel when gestures are off", () => {
    render(
      <ViewerControls
        gestureEnabled={false}
        gestureError="This browser does not support webcam gesture controls."
        gestureStatus="unsupported"
        gestureVideoRef={createRef<HTMLVideoElement>()}
        isExploded
        onToggleGestures={vi.fn()}
        onToggleExplode={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Unsupported")).toBeTruthy();
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
});
