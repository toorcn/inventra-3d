"use client";

import type { GestureControlStatus, GestureDebugFrame } from "@/types";
import { Expand, Hand, Minimize2, RotateCcw } from "lucide-react";
import type { MutableRefObject } from "react";

interface ViewerControlsProps {
  gestureDebugFrame?: GestureDebugFrame | null;
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

function formatGestureLabel(name: string | null) {
  if (!name) return "No gesture";

  return name
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function clampToPercent(value: number) {
  return Math.max(0, Math.min(100, value * 100));
}

export function ViewerControls({
  gestureDebugFrame,
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
        <div 
          className="absolute bottom-28 right-6 z-10 w-80 overflow-hidden bg-[var(--bg-panel)] p-4 shadow-2xl backdrop-blur-xl transition-all ring-1 ring-[var(--border-gold)]/20"
          style={{ 
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
          }}
        >
          <div className="absolute top-0 right-0 w-8 h-px bg-[var(--accent-gold)]/50" />
          <div className="absolute top-0 right-0 w-px h-8 bg-[var(--accent-gold)]/50" />
          
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-0.5">Neural Link</p>
              <p className="text-sm font-bold text-white tracking-tight">Gesture Control</p>
            </div>
            <span
              className={`rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[gestureStatus]}`}
            >
              {STATUS_LABELS[gestureStatus]}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/5 bg-black/40">
            <div className="relative aspect-video w-full">
              <video
                ref={gestureVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 scale-x-[-1]">
                {gestureDebugFrame?.bounds ? (
                  <div
                    className="absolute rounded border bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/80 shadow-[0_0_15px_rgba(212,175,85,0.3)]"
                    style={{
                      left: `${clampToPercent(gestureDebugFrame.bounds.minX)}%`,
                      top: `${clampToPercent(gestureDebugFrame.bounds.minY)}%`,
                      width: `${clampToPercent(
                        gestureDebugFrame.bounds.maxX - gestureDebugFrame.bounds.minX,
                      )}%`,
                      height: `${clampToPercent(
                        gestureDebugFrame.bounds.maxY - gestureDebugFrame.bounds.minY,
                      )}%`,
                    }}
                  />
                ) : null}
                {gestureDebugFrame?.palmCenter ? (
                  <div
                    className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[var(--accent-gold)] shadow-[0_0_12px_rgba(212,175,85,0.6)]"
                    style={{
                      left: `${clampToPercent(gestureDebugFrame.palmCenter.x)}%`,
                      top: `${clampToPercent(gestureDebugFrame.palmCenter.y)}%`,
                    }}
                  />
                ) : null}
              </div>
              
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-30" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--accent-gold)]/60 mb-1">Identified</p>
              <p className="text-[10px] font-bold text-white truncate">
                {formatGestureLabel(gestureDebugFrame?.gestureName ?? null).toUpperCase()}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-2 border border-white/5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--accent-gold)]/60 mb-1">Stability</p>
              <p className={`text-[10px] font-bold ${
                gestureDebugFrame?.isStable ? "text-emerald-400" : "text-[var(--text-secondary)]"
              }`}>
                {gestureDebugFrame?.isStable ? "LOCK - STABLE" : "SCAN - DRIFT"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div 
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 bg-[var(--bg-panel)] p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-[var(--border-gold)]/20"
        style={{ 
          clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
        }}
      >
        <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
          <span className={`size-1.5 rounded-full animate-pulse ${
            gestureStatus === 'tracking' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500/50'
          }`} />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Link: {STATUS_LABELS[gestureStatus].toUpperCase()}</span>
        </div>

        <button
          onClick={onToggleGestures}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/5 ${
            gestureEnabled ? "text-[var(--accent-gold)]" : "text-white opacity-60"
          }`}
        >
          <Hand className={`size-3.5 ${gestureEnabled ? 'text-[var(--accent-gold)]' : ''}`} />
          Enable Gestures
        </button>
        
        <div className="h-6 w-px bg-white/10" />
        
        <button
          onClick={onToggleExplode}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/5"
        >
          {isExploded ? <Minimize2 className="size-3.5 text-[var(--accent-gold)]" /> : <Expand className="size-3.5 text-[var(--accent-gold)]" />}
          {isExploded ? "Assemble" : "Exploded View"}
        </button>

        <div className="h-6 w-px bg-white/10" />

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] transition-all hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="size-3.5" />
          Reset Viewer
        </button>
      </div>
    </>
  );
}
