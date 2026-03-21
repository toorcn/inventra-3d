"use client";

interface DemoOverlayProps {
  title: string;
  description: string;
  progress: number;
  step: number;
  totalSteps: number;
  isAutoPlay: boolean;
  isLastStep: boolean;
  onToggleAutoPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  onSkip: () => void;
}

export function DemoOverlay({
  title,
  description,
  progress,
  step,
  totalSteps,
  isAutoPlay,
  isLastStep,
  onToggleAutoPlay,
  onPrev,
  onNext,
  onFinish,
  onSkip,
}: DemoOverlayProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-6 z-30 w-[560px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-blue-300">Demo Mode</span>
        <button onClick={onSkip} className="text-xs text-[var(--text-secondary)] hover:text-white">Skip</button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-white/60">
          Auto-play: {isAutoPlay ? "On (Looping)" : "Paused"}
        </span>
        <button
          onClick={onToggleAutoPlay}
          className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/80 transition-colors hover:bg-white/10"
        >
          {isAutoPlay ? "Pause" : "Resume"}
        </button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] text-white/50">Step {step} of {totalSteps}</span>
      </div>
      <p className="text-sm text-white/85">{description}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onPrev}
          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          className="rounded-lg border border-blue-500/40 bg-blue-600/20 px-2.5 py-1 text-xs text-blue-100 transition-colors hover:bg-blue-500/30"
        >
          Next
        </button>
        {isLastStep && (
          <button
            onClick={onFinish}
            className="rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-2.5 py-1 text-xs text-emerald-100 transition-colors hover:bg-emerald-500/30"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
