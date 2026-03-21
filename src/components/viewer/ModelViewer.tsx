"use client";

import dynamic from "next/dynamic";
import { ViewerLoader } from "@/components/ui/ViewerLoader";

const ModelViewerClient = dynamic(() => import("./ModelViewerClient"), {
  ssr: false,
  loading: () => <ViewerLoader />,
});

interface ModelViewerProps {
  inventionId: string;
  isExploded: boolean;
  selectedComponentId: string | null;
  highlightMap?: Record<string, { color?: string; mode?: "glow" | "pulse" }>;
  beamEffect?: {
    id: string;
    fromComponentId: string;
    toComponentId: string;
    color?: string;
    thickness?: number;
  } | null;
  onComponentSelect: (id: string | null) => void;
}

export default function ModelViewer(props: ModelViewerProps) {
  return <ModelViewerClient {...props} />;
}
