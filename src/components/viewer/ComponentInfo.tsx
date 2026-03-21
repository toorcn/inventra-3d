"use client";

import { getComponentById } from "@/data/invention-components";
import { X } from "lucide-react";

interface ComponentInfoProps {
  componentId: string;
  onClose: () => void;
}

export function ComponentInfo({ componentId, onClose }: ComponentInfoProps) {
  const component = getComponentById(componentId);
  if (!component) return null;

  return (
    <div 
      className="absolute right-4 top-4 z-10 w-80 overflow-hidden bg-[var(--bg-panel)] p-6 shadow-2xl backdrop-blur-xl ring-1 ring-[var(--border-gold)]/20 transition-all animate-in fade-in slide-in-from-right-4"
      style={{ 
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
      }}
    >
      <div className="absolute top-0 left-0 w-8 h-px bg-[var(--accent-gold)]/50" />
      <div className="absolute top-0 left-0 w-px h-8 bg-[var(--accent-gold)]/50" />

      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)] mb-1">Component Analysis</p>
          <h3 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-playfair), serif" }}>{component.name}</h3>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-6 space-y-4">
        <p className="text-[13px] leading-relaxed text-gray-300 antialiased" style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500 }}>
          {component.description}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {component.materials.map((mat) => (
            <span key={mat} className="rounded-sm border border-[var(--border-gold)]/20 bg-[var(--accent-gold)]/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-gold-light)]">
              {mat}
            </span>
          ))}
        </div>
      </div>

      {component.patentText && (
        <div className="relative overflow-hidden rounded-lg bg-black/40 p-3 border border-white/5">
          <p className="text-[10px] italic leading-relaxed text-[var(--text-secondary)] opacity-80">
            {component.patentText}
          </p>
          <div className="absolute bottom-1 right-2 flex gap-1 opacity-20">
             <div className="size-1 rounded-full bg-white" />
             <div className="size-1 rounded-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
