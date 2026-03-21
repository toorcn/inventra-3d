"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { inventions } from "@/data/inventions";

interface TemporosSliderProps {
  year: number;
  onYearChange: (year: number) => void;
  className?: string;
}

const MIN_YEAR = 1600;
const MAX_YEAR = 2025;
const DECADE_LABELS = [1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000];

function yearToPercent(year: number): number {
  return ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
}

function percentToYear(percent: number): number {
  return Math.round(MIN_YEAR + (percent / 100) * (MAX_YEAR - MIN_YEAR));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function TemporosSlider({ year, onYearChange, className = "" }: TemporosSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [ripples, setRipples] = useState<{ id: string; title: string }[]>([]);

  const visibleCount = inventions.filter((inv) => inv.inventionDate <= year).length;

  // Compute ripple indicators: inventions whose commercialisationDate is within 5 years of current year
  useEffect(() => {
    const active = inventions.filter(
      (inv) => Math.abs(inv.commercialisationDate - year) <= 5
    );
    setRipples(active.map((inv) => ({ id: inv.id, title: inv.title })));
  }, [year]);

  const updateYearFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const rawPercent = ((clientX - rect.left) / rect.width) * 100;
      const clampedPercent = clamp(rawPercent, 0, 100);
      const newYear = clamp(percentToYear(clampedPercent), MIN_YEAR, MAX_YEAR);
      onYearChange(newYear);
    },
    [onYearChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isDragging.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      updateYearFromPointer(e.clientX);
    },
    [updateYearFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      updateYearFromPointer(e.clientX);
    },
    [updateYearFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let delta = 0;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = e.shiftKey ? -50 : -10;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = e.shiftKey ? 50 : 10;
      else return;
      e.preventDefault();
      onYearChange(clamp(year + delta, MIN_YEAR, MAX_YEAR));
    },
    [year, onYearChange]
  );

  const thumbPercent = yearToPercent(year);

  return (
    <div
      className={`z-20 w-full max-w-3xl bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-4 select-none ${className}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/50 font-mono tracking-widest uppercase">
          Temporos
        </span>
        <span className="text-2xl font-bold text-white font-mono tabular-nums">
          {year}
        </span>
        <span className="text-xs text-white/50 font-mono tabular-nums">
          {visibleCount} invention{visibleCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Slider track area */}
      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        tabIndex={0}
        role="slider"
        aria-label="Timeline year"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={year}
        onKeyDown={handleKeyDown}
      >
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full" />

        {/* Active fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
          style={{
            left: 0,
            width: `${thumbPercent}%`,
            backgroundColor: "#2563EB",
          }}
        />

        {/* Invention date markers */}
        {inventions.map((inv) => {
          const pct = yearToPercent(inv.inventionDate);
          const isVisible = inv.inventionDate <= year;
          return (
            <div
              key={inv.id}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none transition-all duration-300"
              style={{
                left: `${pct}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: isVisible ? "#2563EB" : "rgba(255,255,255,0.2)",
                boxShadow: isVisible ? "0 0 6px 2px rgba(37,99,235,0.7)" : "none",
              }}
            />
          );
        })}

        {/* Draggable thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white
                     pointer-events-none"
          style={{
            left: `${thumbPercent}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "#2563EB",
            boxShadow: "0 0 12px 4px rgba(37,99,235,0.5)",
          }}
        />
      </div>

      {/* Decade labels */}
      <div className="relative mt-2 h-4">
        {DECADE_LABELS.map((label) => {
          const pct = yearToPercent(label);
          return (
            <span
              key={label}
              className="absolute text-[10px] text-white/30 font-mono tabular-nums -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Ripple indicators */}
      {ripples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {ripples.map((r) => (
            <span
              key={r.id}
              className="text-[11px] text-blue-400 font-mono animate-pulse"
            >
              {r.title} commercialised
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
