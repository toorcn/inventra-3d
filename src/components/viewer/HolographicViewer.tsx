"use client";

import dynamic from "next/dynamic";
import { ViewerLoader } from "@/components/ui/ViewerLoader";
import type { Invention, InventionComponent } from "@/types";

const HolographicViewerClient = dynamic(
  () => import("./HolographicViewerClient"),
  {
    ssr: false,
    loading: () => <ViewerLoader />,
  }
);

interface HolographicViewerProps {
  invention: Invention;
  onBack: () => void;
  onComponentSelect: (component: InventionComponent | null) => void;
}

export default function HolographicViewer(props: HolographicViewerProps) {
  return <HolographicViewerClient {...props} />;
}
