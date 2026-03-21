"use client";

import React from "react";

interface WebcamLayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function WebcamLayer({ videoRef }: WebcamLayerProps) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "scaleX(-1)",
      }}
    />
  );
}
