"use client";

import { DemoOverlay } from "./DemoOverlay";
import { useEffect, useMemo, useState } from "react";

const STEPS = [
  {
    title: "Welcome to InventorNet",
    description: "You are exploring 25 breakthrough inventions from around the world in a single interactive map.",
  },
  {
    title: "Step 1: Start with the globe",
    description: "Click any highlighted country to jump there and narrow the invention list to that region.",
  },
  {
    title: "Step 2: Refine with filters",
    description: "Use category chips and search in the right panel to quickly focus on a domain or topic.",
  },
  {
    title: "Step 3: Inspect an invention",
    description: "Select an invention card to open details, then enter the 3D viewer for a deeper walkthrough.",
  },
  {
    title: "Step 4: Explore components",
    description: "In viewer mode, inspect model parts and relationships to understand how each invention works.",
  },
  {
    title: "Step 5: Learn with AI context",
    description: "Ask the AI expert from the invention detail panel for technical explanations and historical context.",
  },
  {
    title: "You are ready",
    description: "Use Reset View anytime to restart discovery from a neutral map perspective.",
  },
];

interface DemoModeProps {
  running: boolean;
  onStop: () => void;
}

export function DemoMode({ running, onStop }: DemoModeProps) {
  const [step, setStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!running) {
      setStep(0);
      setIsAutoPlay(true);
      return;
    }

    if (!isAutoPlay) {
      return;
    }

    const id = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= STEPS.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 5500);

    return () => window.clearInterval(id);
  }, [isAutoPlay, running]);

  const progress = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step],
  );

  const goPrev = () => {
    setIsAutoPlay(false);
    setStep((prev) => (prev === 0 ? STEPS.length - 1 : prev - 1));
  };

  const goNext = () => {
    setIsAutoPlay(false);
    setStep((prev) => (prev === STEPS.length - 1 ? 0 : prev + 1));
  };

  const handleToggleAutoPlay = () => {
    setIsAutoPlay((prev) => !prev);
  };

  const handleFinish = () => {
    setIsAutoPlay(false);
    onStop();
  };

  if (!running) return null;

  return (
    <DemoOverlay
      title={STEPS[step].title}
      description={STEPS[step].description}
      progress={progress}
      step={step + 1}
      totalSteps={STEPS.length}
      isAutoPlay={isAutoPlay}
      isLastStep={step === STEPS.length - 1}
      onToggleAutoPlay={handleToggleAutoPlay}
      onPrev={goPrev}
      onNext={goNext}
      onFinish={handleFinish}
      onSkip={onStop}
    />
  );
}
