"use client";

import React, { useState, useEffect } from "react";

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  onChange: (year: number) => void;
}

export function TimelineSlider({
  minYear,
  maxYear,
  currentYear,
  onChange,
}: TimelineSliderProps) {
  const [val, setVal] = useState(currentYear);

  useEffect(() => {
    setVal(currentYear);
  }, [currentYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value, 10);
    setVal(newVal);
    onChange(newVal);
  };

  const formatYear = (year: number) => {
    if (year < 0) return `${Math.abs(year)} BC`;
    if (year === maxYear) return "Present";
    return `${year} AD`;
  };

  const getYearLabel = (year: number) => {
    if (year <= -2000) return "Ancient";
    if (year >= 2024) return "Now";
    return year.toString();
  };

  const markers = [
    { year: minYear, label: "Ancient" },
    { year: 1000, label: "1000" },
    { year: 1500, label: "1500" },
    { year: 1800, label: "1800" },
    { year: 1900, label: "1900" },
    { year: 2000, label: "2000" },
    { year: maxYear, label: "Now" },
  ];

  return (
    <div className="flex flex-col items-center gap-0 w-full max-w-lg px-2 pointer-events-auto">
      <div className="flex items-center justify-center w-full mb-0.5">
        <span className="text-[var(--accent-gold)] font-bold text-lg uppercase tracking-[0.2em] drop-shadow-[0_0_6px_rgba(212,175,85,0.4)]" style={{ fontFamily: "var(--font-playfair), serif" }}>
          {formatYear(val)}
        </span>
      </div>

      <div className="relative w-full h-2 flex items-center">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-[var(--accent-gold)]/0 via-[var(--accent-gold)]/40 to-[var(--accent-gold)]/0 -translate-y-1/2 rounded-full" />
        
        {/* Slider Input */}
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={val}
          onChange={handleChange}
          className="timeline-slider z-20"
        />

        {/* Ultra-simplified Markers Layer */}
        <div className="absolute top-full left-0 w-full flex justify-between mt-0.5 opacity-50">
          {[
            { year: minYear, label: "BC" },
            { year: 0, label: "0" },
            { year: 1000, label: "1000" },
            { year: maxYear, label: "Now" },
          ].map((m) => {
            const percent = ((m.year - minYear) / (maxYear - minYear)) * 100;
            return (
              <div
                key={m.year}
                className="flex flex-col items-center"
                style={{ position: "absolute", left: `${percent}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-[1px] h-1 bg-[var(--accent-gold)]/30 mb-0.5" />
                <span className="text-[7.5px] font-medium uppercase tracking-[0.05em] text-[var(--accent-gold-light)]/70">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-40">
        Timeline of Innovation
      </div>

      <style jsx>{`
        .timeline-slider {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
          cursor: pointer;
        }
        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: var(--accent-gold);
          border: 1.5px solid white;
          box-shadow: 0 0 8px var(--accent-gold);
          margin-top: -6.5px; /* Centers thumb on track */
          transition: transform 0.2s ease;
        }
        .timeline-slider:hover::-webkit-slider-thumb {
          transform: scale(1.1);
          box-shadow: 0 0 10px var(--accent-gold);
        }
        .timeline-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
        }
        .timeline-slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: var(--accent-gold);
          border: 1.5px solid white;
          box-shadow: 0 0 6px var(--accent-gold);
        }
        .timeline-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
