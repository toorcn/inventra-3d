"use client";

import { Expand, Minimize2, RotateCcw } from "lucide-react";

interface ViewerControlsProps {
  isExploded: boolean;
  onToggleExplode: () => void;
  onReset: () => void;
}

export function ViewerControls({ isExploded, onToggleExplode, onReset }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[var(--bg-panel)] px-4 py-2 backdrop-blur-xl">
      <button
        onClick={onToggleExplode}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
      >
        {isExploded ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
        {isExploded ? "Assemble" : "Explode"}
      </button>
      <div className="h-4 w-px bg-white/15" />
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="size-4" />
        Reset
      </button>
    </div>
  );
}
