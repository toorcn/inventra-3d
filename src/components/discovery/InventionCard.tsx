"use client";

import { getInventionOriginLabel } from "@/lib/invention-origin";
import type { Invention } from "@/types";
import { Box, ChevronRight } from "lucide-react";

interface InventionCardProps {
  invention: Invention;
  isSelected: boolean;
  onClick: () => void;
  onPreview?: () => void;
}

export function InventionCard({ invention, isSelected, onClick, onPreview }: InventionCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-200 ${
        isSelected
          ? "border-white/20 bg-white/10 shadow-[0_0_20px_-10px_rgba(255,255,255,0.2)]"
          : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.05]"
      }`}
    >
      <div className="px-3.5 py-2.5">
        <div className="flex items-center gap-2 pr-1">
          <span className="flex-1 truncate text-[13px] font-semibold leading-snug text-white/90 group-hover:text-white transition-colors">
            {invention.title}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {invention.hasModel && (
              <Box className="size-3 text-white/45 group-hover:text-white/65 transition-colors" />
            )}
            <ChevronRight className="size-3.5 text-white/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/40" />
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium tabular-nums text-white/35">{invention.year}</span>
          <span className="text-white/15">·</span>
          <span className="relative inline-flex max-w-full">
            <span
              className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-36 overflow-hidden rounded-lg border border-white/15 bg-[#08101d]/95 opacity-0 shadow-xl shadow-black/35 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              <img
                src={invention.imageSrc}
                alt=""
                className="h-20 w-full object-cover"
              />
            </span>
            <span className="truncate text-[11px] text-white/35">{getInventionOriginLabel(invention)}</span>
          </span>
        </div>

        <div className="mt-1">
          <span className="text-[10px] text-white/20 italic">{invention.avatarPersona}</span>
        </div>
      </div>
    </button>
  );
}
