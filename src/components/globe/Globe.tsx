"use client";

import dynamic from "next/dynamic";
import { GlobeLoader } from "@/components/ui/GlobeLoader";

const GlobeClient = dynamic(() => import("./GlobeClient"), {
  ssr: false,
  loading: () => <GlobeLoader />,
});

export default GlobeClient;
