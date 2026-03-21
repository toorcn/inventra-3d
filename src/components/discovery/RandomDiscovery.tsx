"use client";

import type { Invention } from "@/types";
import { inventions } from "@/data/inventions";
import { Dices, X, MapPin, User, Globe2 } from "lucide-react";
import { useState, useCallback } from "react";
import Image from "next/image";

/* Map invention IDs → image file names in /public/inventions/ */
const INVENTION_IMAGES: Record<string, string> = {
  "light-bulb": "/inventions/light-bulb.png",
  "telephone": "/inventions/telephone.png",
  "printing-press": "/inventions/printing-press.png",
  "steam-engine": "/inventions/steam-engine.png",
  "compass": "/inventions/compass.png",
  "wright-flyer": "/inventions/wright-flyer.png",
  "tesla-coil": "/inventions/tesla-coil.png",
  "gunpowder": "/inventions/gunpowder.png",
  "iphone": "/inventions/iphone.png",
  "penicillin": "/inventions/penicillin.png",
  "dna-structure": "/inventions/dna-structure.png",
  "solar-cell": "/inventions/solar-cell.png",
  "macintosh": "/inventions/macintosh.png",
  "crispr": "/inventions/crispr.png",
  "transistor": "/inventions/transistor.png",
  "world-wide-web": "/inventions/world-wide-web.png",
  "jet-engine": "/inventions/jet-engine.png",
  "dynamite": "/inventions/dynamite.png",
  "mrna-vaccine": "/inventions/mrna-vaccine.svg",
  "lithium-ion-battery": "/inventions/lithium-ion-battery.svg",
  "bullet-train": "/inventions/bullet-train.svg",
  "carbon-fiber": "/inventions/carbon-fiber.svg",
  "radio": "/inventions/radio.svg",
  "integrated-circuit": "/inventions/integrated-circuit.svg",
  "automobile": "/inventions/automobile.svg",
  "kevlar": "/inventions/kevlar.svg",
};

interface RandomDiscoveryProps {
  onViewOnGlobe?: (invention: Invention) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function RandomDiscovery({ onViewOnGlobe, onOpen, onClose }: RandomDiscoveryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<Invention | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const roll = useCallback(() => {
    setIsRolling(true);
    // Brief animation delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * inventions.length);
      setCurrent(inventions[randomIndex]);
      setIsRolling(false);
    }, 400);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
    roll();
  }, [roll, onOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrent(null);
    onClose?.();
  }, [onClose]);


  const handleViewOnGlobe = useCallback(() => {
    if (current && onViewOnGlobe) {
      onViewOnGlobe(current);
      setIsOpen(false);
    }
  }, [current, onViewOnGlobe]);

  const yearLabel = current
    ? current.year < 0
      ? `${Math.abs(current.year)} BC`
      : `${current.year} AD`
    : "";

  const imageSrc = current ? INVENTION_IMAGES[current.id] ?? null : null;

  return (
    <>
      {/* Trigger button — top-right */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border-gold)] bg-[var(--bg-panel)] px-4 py-2.5 text-sm font-medium text-[var(--accent-gold)] backdrop-blur-xl transition-all hover:bg-[var(--accent-gold)]/10 hover:shadow-[var(--glow-gold)]"
      >
        <Dices className="size-4" />
        Random Discovery
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-panel)] shadow-2xl shadow-black/50">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-5 pb-3 text-center">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Today you discovered:
              </p>
            </div>

            {isRolling ? (
              /* Rolling animation */
              <div className="flex h-72 items-center justify-center">
                <Dices className="size-12 animate-spin text-[var(--accent-gold)]" />
              </div>
            ) : current ? (
              <>
                {/* Image area */}
                <div className="mx-6 overflow-hidden rounded-xl border border-[var(--border-gold)] bg-[var(--bg-secondary)]">
                  {imageSrc ? (
                    <div className="relative h-52 w-full">
                      <Image
                        src={imageSrc}
                        alt={current.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 100vw, 400px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[var(--accent-navy)] to-[var(--bg-primary)]">
                      <div className="text-center">
                        <Globe2 className="mx-auto mb-2 size-10 text-[var(--accent-gold)]/30" />
                        <p className="text-xs text-[var(--text-secondary)]">{current.title}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invention info */}
                <div className="px-6 pt-5 pb-2 text-center">
                  <h3
                    className="text-2xl font-bold uppercase tracking-wide text-[var(--accent-gold)]"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    {current.title}
                  </h3>

                  <div className="mt-2 flex items-center justify-center gap-1.5 text-sm">
                    <MapPin className="size-3 text-blue-400" />
                    <span className="text-blue-400">{current.country}, {yearLabel}</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <User className="size-3" />
                    <span>{current.inventors.join(", ")}</span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {current.description.length > 120
                      ? current.description.slice(0, 120) + "…"
                      : current.description}
                  </p>

                  <p
                    className="mt-3 text-xs italic text-[var(--accent-gold)]/60"
                    style={{ fontFamily: "var(--font-cormorant), serif", letterSpacing: "0.15em" }}
                  >
                    …BRO INVENTED THAT.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3 px-6 pb-6 pt-3">
                  <button
                    onClick={handleViewOnGlobe}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/40 bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--accent-gold)] transition-all hover:bg-[var(--accent-gold)]/10"
                  >
                    <Globe2 className="size-4" />
                    View on Globe
                  </button>
                  <button
                    onClick={roll}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/40 bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--accent-gold)] transition-all hover:bg-[var(--accent-gold)]/10"
                  >
                    Roll Again <span className="text-base">🎲</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
