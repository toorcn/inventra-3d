"use client";

import { Badge } from "@/components/ui/Badge";
import { getInventionOriginLabel } from "@/lib/invention-origin";
import type { Invention } from "@/types";
import { ArrowRight, Box, Info, MapPin, Sparkles } from "lucide-react";

interface OverlayPosition {
  left: number;
  top: number;
}

interface InventionFocusOverlayProps {
  invention: Invention;
  position: OverlayPosition;
  mode: "preview" | "context";
  onActivate: (invention: Invention) => void;
  onEnterViewer?: (invention: Invention) => void;
  onOpenDetails?: (invention: Invention) => void;
}

function getContextSnippet(description: string): string {
  const [firstSentence] = description.split(/(?<=[.!?])\s+/);
  return firstSentence ?? description;
}

export function InventionFocusOverlay({
  invention,
  position,
  mode,
  onActivate,
  onEnterViewer,
  onOpenDetails,
}: InventionFocusOverlayProps) {
  const isContext = mode === "context";

  return (
    <div
      className="pointer-events-auto absolute z-20"
      style={{
        left: position.left,
        top: position.top,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="w-[240px] overflow-hidden rounded-[28px] border border-blue-300/20 bg-[#07111d]/92 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => onActivate(invention)}
          className="group block w-full text-left"
        >
          <div className="relative">
            <img
              src={invention.imageSrc}
              alt={invention.imageAlt}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${isContext ? "h-36" : "h-28"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111d] via-[#07111d]/25 to-transparent" />
            <div className="absolute left-3 top-3">
              <Badge category={invention.category} />
            </div>
            {!isContext ? (
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-blue-300/25 bg-blue-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">
                <Sparkles className="size-3" />
                Focused
              </div>
            ) : null}
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100/45">
                  {isContext ? "On the Globe" : "Preview"}
                </p>
                <h3 className="mt-1 text-base font-semibold leading-tight text-white">
                  {invention.title}
                </h3>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-blue-200/55 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
            <div className="flex items-center gap-2 text-xs text-white/65">
              <MapPin className="size-3.5 text-blue-300/70" />
              <span className="truncate">{getInventionOriginLabel(invention)}</span>
              <span className="text-white/30">·</span>
              <span>{invention.year}</span>
            </div>
            {isContext ? (
              <p className="line-clamp-3 text-sm leading-6 text-white/72">
                {getContextSnippet(invention.description)}
              </p>
            ) : (
              <p className="text-xs text-blue-100/55">
                Click on the globe marker to open context and continue into the interactive learning view.
              </p>
            )}
          </div>
        </button>

        {isContext ? (
          <div className="grid gap-2 border-t border-white/8 bg-white/[0.02] p-3">
            {invention.hasModel ? (
              <button
                type="button"
                onClick={() => onEnterViewer?.(invention)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <Box className="size-4" />
                Enter Interactive 3D View
              </button>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                This invention is available in discovery, but it does not have an interactive 3D model yet.
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenDetails?.(invention)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Info className="size-4" />
              Open Details
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
