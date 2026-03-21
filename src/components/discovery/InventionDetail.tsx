"use client";

import { Badge } from "@/components/ui/Badge";
import type { Invention } from "@/types";
import { ArrowLeft, Box, Calendar, MapPin, User, FileText } from "lucide-react";
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
        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 shadow-sm transition-colors hover:bg-white/[0.04]">
            <Calendar className="size-4 text-blue-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Year</p>
              <p className="text-sm font-semibold text-white">{invention.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 shadow-sm transition-colors hover:bg-white/[0.04]">
            <MapPin className="size-4 text-cyan-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Origin</p>
              <p className="text-sm font-semibold text-white truncate">{invention.location.label}</p>
            </div>
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8">
          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-blue-500/50 before:to-transparent">
            <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <User className="size-3.5" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Key Inventors</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-100 font-medium">
              {invention.inventors.join(", ")}
            </p>
          </section>

          <section className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-cyan-500/50 before:to-transparent">
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

          <div className="mt-10 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 ring-1 ring-blue-500/10 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">Historical Record</span>
              {invention.patentNumber ? (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[8px] font-bold uppercase text-blue-300">Patent Confirmed</span>
              ) : (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase text-white/30">No Patent</span>
              )}
            </div>
            {invention.patentNumber ? (
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-blue-400/60 uppercase">No.</span>
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
        {onEnterViewer ? (
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
        )}
      </div>
    </div>
  );
}
