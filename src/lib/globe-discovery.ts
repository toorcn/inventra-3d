import type { GlobeCameraController } from "@/components/globe/camera-controller";
import type { Invention } from "@/types";

type SelectInvention = (id: string | null) => void;
type SetTemporosYear = (year: number) => void;

export function focusInvention(
  invention: Invention,
  focusInventionId: SelectInvention,
  camera: GlobeCameraController | null,
) {
  focusInventionId(invention.id);
  camera?.flyToInvention(invention);
}

export function focusInventionById(
  inventionId: string | null,
  inventions: Invention[],
  focusInventionId: SelectInvention,
  camera: GlobeCameraController | null,
) {
  if (!inventionId) {
    focusInventionId(null);
    camera?.resumeAutoRotateAfterDelay();
    return null;
  }

  const invention = inventions.find((candidate) => candidate.id === inventionId) ?? null;
  if (!invention) return null;

  focusInvention(invention, focusInventionId, camera);
  return invention;
}

export function resetDiscoveryView(
  resetFilters: () => void,
  setTemporosYear: SetTemporosYear,
  camera: GlobeCameraController | null,
  year = 2025,
) {
  resetFilters();
  setTemporosYear(year);
  camera?.reset();
}
