"use client";

import { Badge } from "@/components/ui/Badge";
import { getInventionOriginLabel } from "@/lib/invention-origin";
import type { Invention } from "@/types";
import { ArrowLeft, Box, Calendar, ExternalLink, MapPin, User, FileText } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface InventionDetailProps {
  invention: Invention;
  onBack: () => void;
  onEnterViewer?: (invention: Invention) => void;
}

export function InventionDetail({ invention, onBack, onEnterViewer }: InventionDetailProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header section with back button and title */}
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

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 py-6">
        <div className="mb-8 overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] shadow-2xl shadow-black/20">
          <img
            src={invention.imageSrc}
            alt={invention.imageAlt}
            className="h-56 w-full object-cover sm:h-64"
          />
          <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">
                Image Source
              </p>
              <p className="text-sm text-white/70">{getInventionOriginLabel(invention)}</p>
            </div>
            <a
              href={invention.imageSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white hover:bg-white/[0.08]"
            >
              View Image Source
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 shadow-sm transition-colors hover:bg-white/[0.04]">
            <Calendar className="size-4 text-white/60" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Year</p>
              <p className="text-sm font-semibold text-white">{invention.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 shadow-sm transition-colors hover:bg-white/[0.04]">
            <MapPin className="size-4 text-white/60" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Origin</p>
              <p className="text-sm font-semibold text-white truncate">{getInventionOriginLabel(invention)}</p>
            </div>
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8">
          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-white/30 before:to-transparent">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <User className="size-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Key Inventors</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-100 font-medium">
              {invention.inventors.join(", ")}
            </p>
          </section>

          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-white/30 before:to-transparent">
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

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 ring-1 ring-white/10 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/65">Historical Record</span>
              {invention.patentNumber ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase text-white/75">Patent Confirmed</span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase text-white/30">No Patent</span>
              )}
            </div>
            {invention.patentNumber ? (
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-white/55 uppercase">No.</span>
                <div className="text-xl font-mono font-bold tracking-tighter text-white">
                  {invention.patentNumber}
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-white/50 italic">Pre-patent era</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer action section */}
      <div className="border-t border-white/5 bg-white/[0.04] p-4 backdrop-blur-md">
        {onEnterViewer && invention.hasModel ? (
          <button
            onClick={() => onEnterViewer(invention)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)",
              boxShadow: "0 0 20px -5px #2563EB88",
            }}
          >
            <Box className="size-5" />
            Enter Holographic Viewer
          </button>
        ) : (
          invention.hasModel ? (
            <Link href={`/invention/${invention.id}`}>
              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)",
                  boxShadow: "0 0 20px -5px #2563EB88",
                }}
              >
                <Box className="size-5" />
                Enter Holographic Viewer
              </button>
            </Link>
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center text-sm text-white/55">
              This entry is available on the globe and in discovery, but it does not have a holographic 3D model yet.
            </div>
          )
        )}
      </div>
    </div>
  );
}
