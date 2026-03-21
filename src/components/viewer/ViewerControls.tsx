"use client";

import type { GestureControlStatus } from "@/types";
import { Expand, Hand, Minimize2, RotateCcw } from "lucide-react";
import type { MutableRefObject } from "react";

interface ViewerControlsProps {
  gestureEnabled: boolean;
  gestureError: string | null;
  gestureStatus: GestureControlStatus;
  gestureVideoRef: MutableRefObject<HTMLVideoElement | null>;
  isExploded: boolean;
  onToggleGestures: () => void;
  onToggleExplode: () => void;
  onReset: () => void;
}

const STATUS_LABELS: Record<GestureControlStatus, string> = {
  blocked: "Camera blocked",
  error: "Tracking error",
  idle: "Idle",
  starting: "Starting",
  tracking: "Tracking",
  unsupported: "Unsupported",
};

const STATUS_STYLES: Record<GestureControlStatus, string> = {
  blocked: "border-amber-400/30 bg-amber-500/15 text-amber-200",
  error: "border-red-400/30 bg-red-500/15 text-red-200",
  idle: "border-white/10 bg-white/5 text-[var(--text-secondary)]",
  starting: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
  tracking: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  unsupported: "border-orange-400/30 bg-orange-500/15 text-orange-100",
};

export function ViewerControls({
  gestureEnabled,
  gestureError,
  gestureStatus,
  gestureVideoRef,
  isExploded,
  onToggleGestures,
  onToggleExplode,
  onReset,
}: ViewerControlsProps) {
  return (
    <>
      {gestureEnabled ? (
        <div className="absolute bottom-24 right-4 z-10 w-72 rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-3 shadow-2xl backdrop-blur-xl sm:right-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Gesture Control</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Open palm rotates. Thumb up explodes. Thumb down assembles.
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[gestureStatus]}`}
            >
              {STATUS_LABELS[gestureStatus]}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <video
              ref={gestureVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full scale-x-[-1] object-cover"
            />
          </div>

          {gestureError ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-[var(--text-secondary)]">
              {gestureError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="absolute bottom-6 left-1/2 z-10 flex w-[min(92vw,44rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--bg-panel)] px-3 py-3 backdrop-blur-xl sm:w-auto sm:rounded-full sm:px-4 sm:py-2">
        <button
          onClick={onToggleGestures}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            gestureEnabled
              ? "bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
              : "text-white hover:bg-white/10"
          }`}
        >
          <Hand className="size-4" />
          {gestureEnabled ? "Disable Gestures" : "Enable Gestures"}
        </button>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[gestureStatus]}`}
        >
          {STATUS_LABELS[gestureStatus]}
        </span>
        <div className="hidden h-4 w-px bg-white/15 sm:block" />
        <button
          onClick={onToggleExplode}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          {isExploded ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
          {isExploded ? "Assemble" : "Explode"}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>
      </div>
    </>
  );
}
