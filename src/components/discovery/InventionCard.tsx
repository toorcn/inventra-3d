"use client";

import { Badge } from "@/components/ui/Badge";
import type { Invention } from "@/types";
import { Box } from "lucide-react";

interface InventionCardProps {
  invention: Invention;
  isSelected: boolean;
  onClick: () => void;
}

export function InventionCard({ invention, isSelected, onClick }: InventionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        isSelected
          ? "border-blue-400/50 bg-blue-500/10 shadow-[var(--glow-blue)]"
          : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="truncate text-sm font-medium text-white">{invention.title}</span>
        {invention.hasModel && <Box className="size-3.5 shrink-0 text-cyan-400" />}
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>{invention.year}</span>
        <span className="text-white/20">|</span>
        <span className="truncate">{invention.country}</span>
      </div>
      <div className="mt-2">
        <Badge category={invention.category} />
      </div>
    </button>
  );
}
