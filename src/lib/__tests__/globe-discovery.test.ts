import type { GlobeCameraController } from "@/components/globe/camera-controller";
import { inventions } from "@/data/inventions";
import {
  focusInvention,
  focusInventionById,
  resetDiscoveryView,
} from "@/lib/globe-discovery";
import { describe, expect, it, vi } from "vitest";

function createCameraController(): GlobeCameraController {
  return {
    flyToInvention: vi.fn(),
    reset: vi.fn(),
    pauseAutoRotate: vi.fn(),
    resumeAutoRotateAfterDelay: vi.fn(),
  };
}

describe("globe discovery helpers", () => {
  it("selects and focuses an invention", () => {
    const selectInvention = vi.fn();
    const camera = createCameraController();
    const invention = inventions[0];

    focusInvention(invention, selectInvention, camera);

    expect(selectInvention).toHaveBeenCalledWith(invention.id);
    expect(camera.flyToInvention).toHaveBeenCalledWith(invention);
  });

  it("focuses a selected invention by id", () => {
    const selectInvention = vi.fn();
    const camera = createCameraController();
    const invention = inventions[1];

    const result = focusInventionById(invention.id, inventions, selectInvention, camera);

    expect(result).toEqual(invention);
    expect(selectInvention).toHaveBeenCalledWith(invention.id);
    expect(camera.flyToInvention).toHaveBeenCalledWith(invention);
  });

  it("clears the selected invention and resumes rotation when id is null", () => {
    const selectInvention = vi.fn();
    const camera = createCameraController();

    const result = focusInventionById(null, inventions, selectInvention, camera);

    expect(result).toBeNull();
    expect(selectInvention).toHaveBeenCalledWith(null);
    expect(camera.resumeAutoRotateAfterDelay).toHaveBeenCalled();
  });

  it("ignores unknown invention ids", () => {
    const selectInvention = vi.fn();
    const camera = createCameraController();

    const result = focusInventionById("unknown", inventions, selectInvention, camera);

    expect(result).toBeNull();
    expect(selectInvention).not.toHaveBeenCalled();
    expect(camera.flyToInvention).not.toHaveBeenCalled();
  });

  it("resets filters, year, and camera view together", () => {
    const resetFilters = vi.fn();
    const setTemporosYear = vi.fn();
    const camera = createCameraController();

    resetDiscoveryView(resetFilters, setTemporosYear, camera);

    expect(resetFilters).toHaveBeenCalled();
    expect(setTemporosYear).toHaveBeenCalledWith(2025);
    expect(camera.reset).toHaveBeenCalled();
  });
});
