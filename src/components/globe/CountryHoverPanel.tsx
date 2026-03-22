import type { CountryHoverData, Invention } from "@/types";
import { categoryColorMap } from "@/data/categories";
import { Box, Calendar, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { INVENTION_IMAGES } from "@/lib/inventionImages";

interface CountryHoverPanelProps {
  data: CountryHoverData | null;
  onInventionClick: (id: string) => void;
  isPinned?: boolean;
  onClose?: () => void;
}

function InventionRow({ invention, onClick }: { invention: Invention; onClick: () => void }) {
  const dot = categoryColorMap[invention.category];
  const imageSrc = INVENTION_IMAGES[invention.id];

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-all hover:bg-white/[0.08]"
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[var(--bg-secondary)] transition-transform group-hover:scale-105">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={invention.title}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
            <Lightbulb className="size-5 opacity-20" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)]">
          {invention.title}
          {invention.hasModel && <Box className="size-3 shrink-0 text-[var(--accent-gold)] opacity-70" />}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5 opacity-50" />
            {invention.year < 0 ? `${Math.abs(invention.year)} BC` : `${invention.year} AD`}
          </span>
          <span className="opacity-40">|</span>
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dot, boxShadow: `0 0 6px ${dot}88` }}
          />
          <span className="truncate opacity-70">{invention.inventors[0]}</span>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 -translate-x-1 text-[var(--text-secondary)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  );
}

export function CountryHoverPanel({ data, onInventionClick, isPinned, onClose }: CountryHoverPanelProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (data) {
      setActive(true);
    } else if (!isPinned) {
      const timer = setTimeout(() => setActive(false), 200);
      return () => clearTimeout(timer);
    }
  }, [data, isPinned]);

  if (!active || (!data && !isPinned)) return null;

  return (
    <div
      className={`pointer-events-auto absolute left-[332px] top-28 z-40 w-72 overflow-hidden rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-panel)] shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out ${data ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-8 opacity-0"
        }`}
    >
      <div className="border-b border-[var(--border-gold)]/30 bg-[var(--accent-gold)]/5 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-[#0a0b14] shadow-[0_0_12px_rgba(212,175,85,0.4)]"
              style={{ background: "linear-gradient(135deg, #ffffffff, #f5f0e1)" }}
            >
              {data?.inventions.length ?? 0}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)] opacity-70">
                Discovered in
              </p>
              <p className="text-lg font-bold tracking-wide text-[var(--accent-gold)] drop-shadow-sm" style={{ fontFamily: "var(--font-playfair), serif" }}>
                {data?.country}
              </p>
            </div>
          </div>
          {isPinned && onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-white/10 text-[var(--accent-gold)]"
              title="Back to Globe"
            >
              <ChevronRight className="size-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[calc(100vh-20rem)] overflow-y-auto px-1.5 py-2 scrollbar-hide">
        {data?.inventions && data.inventions.length > 0 ? (
          data.inventions.map((inv) => (
            <InventionRow
              key={inv.id}
              invention={inv}
              onClick={() => onInventionClick(inv.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="rounded-full bg-white/5 p-3 mb-3">
              <Lightbulb className="size-6 text-[var(--accent-gold)] opacity-30" />
            </div>
            <p className="text-xs font-semibold text-[var(--accent-gold)] mb-1">
              Stay tuned for more inventions update!
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              Our archivists are currently cataloging more historical breakthroughs from this region.
            </p>
            <button
              onClick={onClose}
              className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#0a0b14] transition-all hover:bg-[var(--accent-gold-light)] hover:shadow-[0_0_15px_rgba(212,175,85,0.4)]"
            >
              <RotateCcw className="size-3" />
              Return to Universe
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-gold)]/10 px-4 py-2 bg-black/20">
        <p className="text-[9px] italic text-[var(--text-secondary)] opacity-50 text-center">
          "Spin the planet. Discover who freaking invented"
        </p>
      </div>
    </div>
  );
}
