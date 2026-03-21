"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Invention } from "@/types";
import { ArrowLeft, Box } from "lucide-react";
import Link from "next/link";

interface InventionDetailProps {
  invention: Invention;
  onBack: () => void;
}

export function InventionDetail({ invention, onBack }: InventionDetailProps) {
  return (
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Invention } from "@/types";
import { ArrowLeft, Box, Calendar, MapPin, User, FileText } from "lucide-react";
import Link from "next/link";

interface InventionDetailProps {
  invention: Invention;
  onBack: () => void;
}

export function InventionDetail({ invention, onBack }: InventionDetailProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/5 bg-white/[0.02] p-4">
        <button
          onClick={onBack}
          className="group mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to list
        </button>

        <div>
          <Badge category={invention.category} className="mb-3" />
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {invention.title}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <Calendar className="size-4 text-blue-400" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">Year</p>
              <p className="text-sm font-semibold text-white">{invention.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <MapPin className="size-4 text-cyan-400" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">Country</p>
              <p className="text-sm font-semibold text-white truncate">{invention.country}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <User className="size-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">Inventors</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-100">
              {invention.inventors.join(", ")}
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <FileText className="size-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">Description</h3>
            </div>
            <p className="text-base leading-relaxed text-gray-300 antialiased">
              {invention.description}
            </p>
          </section>

          {invention.patentNumber && (
            <div className="mt-8 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 ring-1 ring-blue-500/20">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Official Patent
              </div>
              <div className="text-lg font-mono font-bold tracking-tight text-white">
                {invention.patentNumber}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 bg-white/[0.02] p-4">
        {invention.hasModel ? (
          <Link href={`/invention/${invention.id}`}>
            <Button className="w-full gap-2 py-6 text-base shadow-[var(--glow-blue)]">
              <Box className="size-5" />
              Explore in 3D
            </Button>
          </Link>
        ) : (
          <Link href={`/invention/${invention.id}`}>
            <Button variant="secondary" className="w-full py-6 text-base">
              View Detailed Concept
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

  );
}
