"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Invention } from "@/types";
import { ArrowLeft, Box, Calendar, MapPin, User, FileText, Lightbulb } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

/* Map invention IDs to image file names in /public/inventions/ */
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

interface InventionDetailProps {
  invention: Invention;
  onBack: () => void;
}

export function InventionDetail({ invention, onBack }: InventionDetailProps) {
  const imageSrc = INVENTION_IMAGES[invention.id];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header section with back button and title */}
      <div className="border-b border-[var(--border-gold)] bg-white/[0.02] p-4">
        <button
          onClick={onBack}
          className="group mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-gold-light)]"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to list
        </button>

        <div>
          <Badge category={invention.category} className="mb-3" />
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
            {invention.title}
          </h2>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 py-6 scrollbar-hide">
        {/* Invention Image Preview */}
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border-gold)]/40 bg-[var(--bg-secondary)] shadow-lg">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={invention.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)]">
              <Lightbulb className="size-12 text-[var(--accent-gold)] opacity-20" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)] opacity-90 drop-shadow-md">
              Visual Archive
            </p>
          </div>
        </div>

        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-gold)] bg-white/[0.03] p-3 shadow-sm transition-colors hover:bg-white/[0.05]">
            <Calendar className="size-4 text-[var(--accent-gold)]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Year</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {invention.year < 0 ? `${Math.abs(invention.year)} BC` : `${invention.year} AD`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-gold)] bg-white/[0.03] p-3 shadow-sm transition-colors hover:bg-white/[0.05]">
            <MapPin className="size-4 text-[var(--accent-gold-light)]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Region</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{invention.country}</p>
            </div>
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8">
          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-[var(--accent-gold)]/50 before:to-transparent">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <User className="size-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Key Inventors</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-100 font-medium">
              {invention.inventors.join(", ")}
            </p>
          </section>

          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-[var(--accent-gold-light)]/50 before:to-transparent">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <FileText className="size-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Invention Story</h3>
            </div>
            <div className="text-[15px] leading-relaxed text-gray-300 antialiased font-normal">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                }}
              >
                {invention.description}
              </ReactMarkdown>
            </div>
          </section>

          {invention.patentNumber && (
            <div className="mt-10 rounded-2xl border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 p-5 ring-1 ring-[var(--accent-gold)]/10 shadow-inner">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)]/80">Historical Record</span>
                <span className="rounded-full bg-[var(--accent-gold)]/20 px-2 py-0.5 text-[8px] font-bold uppercase text-[var(--accent-gold-light)]">Patent Confirmed</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-[var(--accent-gold)]/60 uppercase">No.</span>
                <div className="text-xl font-mono font-bold tracking-tighter text-[var(--text-primary)]">
                  {invention.patentNumber}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer action section */}
      <div className="border-t border-[var(--border-gold)] bg-white/[0.04] p-4 backdrop-blur-md">
        {invention.hasModel ? (
          <Link href={`/invention/${invention.id}`}>
            <Button className="w-full gap-2 py-6 text-base font-bold shadow-[var(--glow-gold)] hover:scale-[1.02] transition-transform active:scale-[0.98]">
              <Box className="size-5" />
              Explore in 3D
            </Button>
          </Link>
        ) : (
          <Link href={`/invention/${invention.id}`}>
            <Button variant="secondary" className="w-full py-6 text-base font-bold hover:bg-white/10 transition-colors">
              Read Detailed Brief
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
