import type { GlobeCameraController } from "@/components/globe/camera-controller";
import type { Invention } from "@/types";

type SelectInvention = (id: string | null) => void;
type SetTemporosYear = (year: number) => void;

export function focusInvention(
  invention: Invention,
  selectInvention: SelectInvention,
  camera: GlobeCameraController | null,
) {
  selectInvention(invention.id);
  camera?.flyToInvention(invention);
}

export function focusInventionById(
  inventionId: string | null,
  inventions: Invention[],
  selectInvention: SelectInvention,
  camera: GlobeCameraController | null,
) {
  if (!inventionId) {
    selectInvention(null);
    camera?.resumeAutoRotateAfterDelay();
    return null;
  }

  const invention = inventions.find((candidate) => candidate.id === inventionId) ?? null;
  if (!invention) return null;

  focusInvention(invention, selectInvention, camera);
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
