"use client";

import { Badge } from "@/components/ui/Badge";
import type { Invention } from "@/types";
import { INVENTION_IMAGES } from "@/lib/inventionImages";
import Image from "next/image";
import { Box } from "lucide-react";

interface InventionCardProps {
  invention: Invention;
  isSelected: boolean;
  onClick: () => void;
}

export function InventionCard({ invention, isSelected, onClick }: InventionCardProps) {
  const imageSrc = INVENTION_IMAGES[invention.id];

  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-xl border p-2 text-left transition-all ${
        isSelected
          ? "border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10 shadow-[var(--glow-gold)]"
          : "border-white/5 bg-white/[0.03] hover:border-[var(--border-gold)] hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex gap-3">
        {/* Small thumbnail */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[var(--bg-secondary)]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={invention.title}
              fill
              className="object-cover transition-transform group-hover:scale-110"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-[var(--accent-gold)]/30">
              <Box className="size-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-gold-light)] transition-colors">
              {invention.title}
            </span>
            {invention.hasModel && <Box className="size-3.5 shrink-0 text-[var(--accent-gold)]" />}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] opacity-70">
            <span>{invention.year < 0 ? `${Math.abs(invention.year)} BC` : `${invention.year} AD`}</span>
            <span className="text-white/20">|</span>
            <span className="truncate">{invention.country}</span>
          </div>
          <div className="mt-1.5 scale-75 origin-left">
            <Badge category={invention.category} />
          </div>
        </div>
      </div>
    </button>
  );
}
