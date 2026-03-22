"use client";

import { CategoryFilter } from "@/components/discovery/CategoryFilter";
import { InventionCard } from "@/components/discovery/InventionCard";
import { InventionDetail } from "@/components/discovery/InventionDetail";
import { SearchInput } from "@/components/ui/SearchInput";
import type { CategoryId, Invention } from "@/types";
import { Globe2, Plus } from "lucide-react";
import Link from "next/link";

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
  onSelectInvention,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearching,
}: Omit<SidePanelProps, "selectedInvention">) {
  return (
    <aside className="pointer-events-auto flex h-full w-[300px] flex-col overflow-hidden rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-panel)] backdrop-blur-xl">
      <div className="border-b border-[var(--border-gold)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="size-5 text-[var(--accent-gold)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Inventions</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--accent-gold)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--accent-gold-light)]">
              {inventions.length}
            </span>
            <Link
              href="/ingest"
              className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/25 transition-colors"
              title="Add invention from patent"
            >
              <Plus className="size-4" />
            </Link>
          </div>
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

      <div className="flex-1 overflow-y-auto p-2">
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
