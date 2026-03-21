import type { Invention } from "@/types";

export interface GlobeCameraController {
  flyToInvention: (invention: Invention) => void;
  reset: () => void;
  pauseAutoRotate: () => void;
  resumeAutoRotateAfterDelay: (delayMs?: number) => void;
}
