"use client";

import { useEffect, useState } from "react";

interface ViewTransitionProps {
  isTransitioning: boolean;
  onTransitionEnd: () => void;
}

type Phase = "idle" | "fade-out" | "black" | "fade-in";

export function ViewTransition({ isTransitioning, onTransitionEnd }: ViewTransitionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!isTransitioning) return;

    // Start fade-out: opacity 0 → 1 over 500ms
    setPhase("fade-out");
    setOpacity(0);

    // Small delay to allow initial render before transitioning opacity
    const t0 = setTimeout(() => {
      setOpacity(1);
    }, 16);

    // At 500ms: fully black phase
    const t1 = setTimeout(() => {
      setPhase("black");
    }, 500);

    // At 800ms: call onTransitionEnd and start fade-in
    const t2 = setTimeout(() => {
      onTransitionEnd();
      setPhase("fade-in");
      setOpacity(0);
    }, 800);

    // At 1300ms: return to idle
    const t3 = setTimeout(() => {
      setPhase("idle");
    }, 1300);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning]);

  if (phase === "idle") return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-500"
      style={{ opacity }}
    />
  );
}
