"use client";

import { CategoryFilter } from "@/components/discovery/CategoryFilter";
import { InventionDetail } from "@/components/discovery/InventionDetail";
import { SearchInput } from "@/components/ui/SearchInput";
import type { CategoryId, Invention } from "@/types";
import { Layers, Sparkles } from "lucide-react";
import { useState } from "react";
import { InventionCard } from "./InventionCard";

interface SidePanelProps {
  inventions: Invention[];
  activeCategories: CategoryId[];
  onToggleCategory: (id: CategoryId) => void;
  selectedInvention: Invention | null;
  onSelectInvention: (id: string | null) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  isSearching: boolean;
  onEnterViewer?: (invention: Invention) => void;
}

export function SidePanel({
  inventions,
  activeCategories,
  onToggleCategory,
  selectedInvention,
  onSelectInvention,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  onEnterViewer,
}: SidePanelProps) {
  const [exaSearching, setExaSearching] = useState(false);

  async function handleSearchSubmit(query: string) {
    // Keep existing local filter behaviour
    onSearchSubmit(query);

    if (!query.trim()) return;

    setExaSearching(true);
    try {
      const res = await fetch("/api/exa-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json() as {
          inventionId: string | null;
          lat: number;
          lng: number;
          regionName: string;
        };

        if (data.inventionId) {
          onSelectInvention(data.inventionId);
        }
      }
    } catch (err) {
      console.error("[SidePanel] exa-search error:", err);
    } finally {
      setExaSearching(false);
    }
  }
  if (selectedInvention) {
    return (
      <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d14]/80 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <InventionDetail
          invention={selectedInvention}
          onBack={() => onSelectInvention(null)}
          onEnterViewer={onEnterViewer}
        />
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d14]/80 shadow-2xl shadow-black/40 backdrop-blur-2xl">

      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-800/20 ring-1 ring-white/10">
              <Layers className="size-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-white leading-none">Inventions</h2>
              <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase mt-0.5">Discovery Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-blue-400/60" />
            <span className="rounded-full bg-gradient-to-r from-blue-600/30 to-blue-500/30 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300 tabular-nums">
              {inventions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={handleSearchSubmit}
          placeholder="Try: renewable energy in Europe"
          isLoading={isSearching || exaSearching}
        />
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* Category filters — single row, horizontal scroll */}
      <div className="px-4 py-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/25">Filter by category</p>
        <CategoryFilter activeCategories={activeCategories} onToggle={onToggleCategory} />
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* Results label */}
      <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">
          {inventions.length === 0 ? "No results" : `${inventions.length} result${inventions.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Invention list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1.5">
          {inventions.map((inv) => (
            <InventionCard
              key={inv.id}
              invention={inv}
              isSelected={false}
              onClick={() => onSelectInvention(inv.id)}
            />
          ))}
          {inventions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-white/30 font-medium">No inventions match your filters.</p>
              <p className="text-xs text-white/15 mt-1">Try adjusting your search or category</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
