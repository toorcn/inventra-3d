"use client";

import { DemoOverlay } from "./DemoOverlay";
import { useEffect, useMemo, useState } from "react";

const STEPS = [
  "Welcome to Inventra — explore 25 breakthrough inventions globally.",
  "Discover innovation by geography with an interactive 3D globe.",
  "Filter by domain like energy, computing, biology, and materials.",
  "Select an invention to open immersive 3D exploration.",
  "Explode the model to inspect core components.",
  "Ask the AI expert for contextual technical explanations.",
  "Inventra turns static patent data into interactive understanding.",
];

interface DemoModeProps {
  running: boolean;
  onStop: () => void;
}

export function DemoMode({ running, onStop }: DemoModeProps) {
  const [step, setStep] = useState(0);
  /** Bumps when the user uses next/prev so the auto-advance timer resets. */
  const [advanceEpoch, setAdvanceEpoch] = useState(0);

  useEffect(() => {
    if (!running) {
      setStep(0);
      setAdvanceEpoch(0);
      return;
    }

    const id = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 4500);

    return () => window.clearInterval(id);
  }, [running, advanceEpoch]);

  const progress = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step],
  );

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setAdvanceEpoch((e) => e + 1);
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0));
    setAdvanceEpoch((e) => e + 1);
  }

  if (!running) return null;

  return (
    <DemoOverlay
      text={STEPS[step]}
      stepIndex={step + 1}
      totalSteps={STEPS.length}
      progress={progress}
      onSkip={onStop}
      onNext={goNext}
      onPrev={goPrev}
      canGoNext={step < STEPS.length - 1}
      canGoPrev={step > 0}
    />
  );
}
