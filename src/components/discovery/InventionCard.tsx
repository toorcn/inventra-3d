"use client";

import { getCategoryById } from "@/data/categories";
import type { Invention } from "@/types";
import { Box, ChevronRight } from "lucide-react";

interface InventionCardProps {
  invention: Invention;
  isSelected: boolean;
  onClick: () => void;
}

export function InventionCard({ invention, isSelected, onClick }: InventionCardProps) {
  const category = getCategoryById(invention.category);

  return (
    <button
      onClick={onClick}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-200 ${
        isSelected
          ? "border-blue-400/40 bg-blue-500/10 shadow-[0_0_20px_-8px_rgba(59,130,246,0.5)]"
          : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.05]"
      }`}
    >
      {/* Left category accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-200 group-hover:opacity-100"
        style={{
          backgroundColor: category.color,
          opacity: isSelected ? 1 : 0.5,
          boxShadow: `0 0 8px 1px ${category.color}55`,
        }}
      />

      <div className="px-3.5 py-2.5 pl-5">
        {/* Title row */}
        <div className="flex items-center gap-2 pr-1">
          <span className="flex-1 truncate text-[13px] font-semibold leading-snug text-white/90 group-hover:text-white transition-colors">
            {invention.title}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {invention.hasModel && (
              <Box className="size-3 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
            )}
            <ChevronRight className="size-3.5 text-white/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/40" />
          </div>
        </div>

        {/* Meta row — year • location • category */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium tabular-nums text-white/35">{invention.year}</span>
          <span className="text-white/15">·</span>
          <span className="truncate text-[11px] text-white/35">{invention.location.label}</span>
          <span className="text-white/15">·</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: category.color + "cc" }}
          >
            {category.name}
          </span>
        </div>

        {/* Avatar persona — subtle */}
        <div className="mt-1">
          <span className="text-[10px] text-white/20 italic">{invention.avatarPersona}</span>
        </div>
      </div>
    </button>
  );
}
