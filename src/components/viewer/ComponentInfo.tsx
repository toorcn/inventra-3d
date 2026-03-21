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
    <div className="absolute right-4 top-4 z-10 w-72 rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-base font-semibold text-white">{component.name}</h3>
        <button onClick={onClose} className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-gray-300">{component.description}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {component.materials.map((mat) => (
          <span key={mat} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {mat}
          </span>
        ))}
      </div>
      {component.patentText && (
        <p className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-xs italic text-[var(--text-secondary)]">
          {component.patentText}
        </p>
      )}
    </div>
  );
}
