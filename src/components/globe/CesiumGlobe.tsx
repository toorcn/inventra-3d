import dynamic from "next/dynamic";
import { GlobeLoader } from "@/components/ui/GlobeLoader";
import type { GlobeCameraController } from "./camera-controller";
import type { Invention } from "@/types";

interface CesiumGlobeProps {
  onInventionSelect: (invention: Invention) => void;
  onCountrySelect: (countryCode: string) => void;
  onCameraReady?: (controller: GlobeCameraController | null) => void;
  focusedInventionId?: string;
  activeInventionId?: string;
  highlightedCountryCodes?: string[];
  temporosYear: number;
  onEnterViewer?: (invention: Invention) => void;
  onOpenDetails?: (invention: Invention) => void;
}

const CesiumGlobe = dynamic<CesiumGlobeProps>(
  () => import("./CesiumGlobeClient"),
  {
    ssr: false,
    loading: () => <GlobeLoader />,
  },
);

export default CesiumGlobe;
