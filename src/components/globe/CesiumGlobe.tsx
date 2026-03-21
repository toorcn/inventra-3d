import dynamic from "next/dynamic";
import { GlobeLoader } from "@/components/ui/GlobeLoader";
import type { Invention } from "@/types";

interface CesiumGlobeProps {
  onInventionSelect: (invention: Invention) => void;
  selectedInventionId?: string;
  temporosYear: number;
}

const CesiumGlobe = dynamic<CesiumGlobeProps>(
  () => import("./CesiumGlobeClient"),
  {
    ssr: false,
    loading: () => <GlobeLoader />,
  },
);

export default CesiumGlobe;
