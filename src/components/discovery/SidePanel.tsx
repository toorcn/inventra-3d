"use client";

import { CategoryFilter } from "@/components/discovery/CategoryFilter";
import { InventionCard } from "@/components/discovery/InventionCard";
import { InventionDetail } from "@/components/discovery/InventionDetail";
import { SearchInput } from "@/components/ui/SearchInput";
import type { CategoryId, Invention } from "@/types";
import { Globe2 } from "lucide-react";

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
}: SidePanelProps) {
  if (selectedInvention) {
    return (
      <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-panel)] backdrop-blur-xl">
        <InventionDetail
          invention={selectedInvention}
          onBack={() => onSelectInvention(null)}
        />
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-panel)] backdrop-blur-xl">
      <div className="border-b border-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="size-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Inventions</h2>
          </div>
          <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300">
            {inventions.length}
          </span>
        </div>

        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder="Try: renewable energy in Europe"
          isLoading={isSearching}
        />

        <div className="mt-3">
          <CategoryFilter activeCategories={activeCategories} onToggle={onToggleCategory} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {inventions.map((inv) => (
            <InventionCard
              key={inv.id}
              invention={inv}
              isSelected={false}
              onClick={() => onSelectInvention(inv.id)}
            />
          ))}
          {inventions.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
              No inventions match your filters.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
