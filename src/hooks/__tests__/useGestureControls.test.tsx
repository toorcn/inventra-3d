import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGestureControls } from "@/hooks/useGestureControls";

const recognizerClose = vi.fn();
const recognizer = {
  close: recognizerClose,
  recognizeForVideo: vi.fn(() => ({
    gestures: [],
    landmarks: [],
  })),
};

const createFromOptions = vi.fn().mockResolvedValue(recognizer);
const forVisionTasks = vi.fn().mockResolvedValue({});

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks,
  },
  GestureRecognizer: {
    createFromOptions,
  },
}));

function GestureHarness({
  enabled,
}: {
  enabled: boolean;
}) {
  const controls = useGestureControls({
    enabled,
    onAssemble: vi.fn(),
    onExplode: vi.fn(),
    onRotate: vi.fn(),
  });

  return (
    <div>
      <span data-testid="status">{controls.status}</span>
      <span data-testid="error">{controls.error ?? ""}</span>
      <video ref={controls.videoRef} />
    </div>
  );
}

describe("useGestureControls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    recognizerClose.mockClear();
    recognizer.recognizeForVideo.mockReset();
    recognizer.recognizeForVideo.mockReturnValue({
      gestures: [],
      landmarks: [],
    });
    createFromOptions.mockClear();
    forVisionTasks.mockClear();
  });

  it("starts tracking when enabled and cleans up when disabled", async () => {
    const stopTrack = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    });

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
      configurable: true,
      get() {
        return HTMLMediaElement.HAVE_CURRENT_DATA;
      },
    });

    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);
    const cancelSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});

    const view = render(<GestureHarness enabled />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("tracking");
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(forVisionTasks).toHaveBeenCalledWith("/mediapipe");
    expect(createFromOptions).toHaveBeenCalledTimes(1);

    view.rerender(<GestureHarness enabled={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("idle");
    });

    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(recognizerClose).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalled();

    playSpy.mockRestore();
    pauseSpy.mockRestore();
    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it("suppresses the known MediaPipe XNNPACK console noise", async () => {
    const stopTrack = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    });

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
      configurable: true,
      get() {
        return HTMLMediaElement.HAVE_CURRENT_DATA;
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      configurable: true,
      get() {
        return 1;
      },
    });

    recognizer.recognizeForVideo.mockImplementation(() => {
      console.error("INFO: Created TensorFlow Lite XNNPACK delegate for CPU.");
      return {
        gestures: [],
        landmarks: [],
      };
    });

    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error");

    render(<GestureHarness enabled />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("tracking");
    });

    expect(recognizer.recognizeForVideo).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
