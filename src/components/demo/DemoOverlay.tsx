"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface DemoOverlayProps {
  text: string;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function DemoOverlay({
  text,
  stepIndex,
  totalSteps,
  progress,
  onSkip,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
}: DemoOverlayProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-6 z-30 w-[520px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-cyan-300">Quick Tour</span>
          <span className="text-xs tabular-nums text-[var(--text-secondary)]">
            Step {stepIndex} of {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-white"
        >
          Skip
        </button>
      </div>
      <p className="text-sm text-white">{text}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-cyan-500/15"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
