"use client";

import { DemoOverlay } from "./DemoOverlay";
import { useEffect, useMemo, useState } from "react";

const STEPS = [
  "Welcome to InventorNet — explore 25 breakthrough inventions globally.",
  "Discover innovation by geography with an interactive 3D globe.",
  "Filter by domain like energy, computing, biology, and materials.",
  "Select an invention to open immersive 3D exploration.",
  "Explode the model to inspect core components.",
  "Ask the AI expert for contextual technical explanations.",
  "InventorNet turns static patent data into interactive understanding.",
];

interface DemoModeProps {
  running: boolean;
  onStop: () => void;
}

export function DemoMode({ running, onStop }: DemoModeProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!running) {
      setStep(0);
      return;
    }

    const id = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          window.clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, 4500);

    return () => window.clearInterval(id);
  }, [running]);

  const progress = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step],
  );

  if (!running) return null;

  return <DemoOverlay text={STEPS[step]} progress={progress} onSkip={onStop} />;
}
