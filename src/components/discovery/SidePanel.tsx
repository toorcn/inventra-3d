"use client";

import { categories } from "@/data/categories";
import { InventionDetail } from "@/components/discovery/InventionDetail";
import { SearchInput } from "@/components/ui/SearchInput";
import type { CategoryId, Invention } from "@/types";
import { Layers, MapPinned } from "lucide-react";
import { useMemo } from "react";
import { InventionCard } from "./InventionCard";

interface SidePanelProps {
  inventions: Invention[];
  panelInventions: Invention[];
  activeCategories: CategoryId[];
  onSelectDomain: (id: CategoryId | null) => void;
  focusedInvention: Invention | null;
  selectedInvention: Invention | null;
  onSelectInvention: (id: string | null) => void;
  onPreviewInvention?: (id: string | null) => void;
  onCloseDetails?: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  isSearching: boolean;
  onEnterViewer?: (invention: Invention) => void;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

export function SidePanel({
  inventions,
  panelInventions,
  activeCategories,
  onSelectDomain,
  focusedInvention,
  selectedInvention,
  onSelectInvention,
  onPreviewInvention,
  onCloseDetails,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  onEnterViewer,
}: SidePanelProps) {
  const selectedDomainId = activeCategories[0] ?? null;

  const domainSummaries = useMemo(() => {
    return categories.map((category) => {
      const matchingInventions = panelInventions.filter(
        (invention) => invention.category === category.id,
      );
      const countries = unique(matchingInventions.map((invention) => invention.country));
      const states = unique(
        matchingInventions.flatMap((invention) =>
          invention.stateOrProvince ? [`${invention.stateOrProvince}, ${invention.country}`] : [],
        ),
      );
      const places = unique(
        matchingInventions.map((invention) =>
          invention.stateOrProvince
            ? `${invention.stateOrProvince}, ${invention.country}`
            : invention.country,
        ),
      );

      return {
        ...category,
        countries,
        states,
        places,
        inventionCount: matchingInventions.length,
      };
    });
  }, [panelInventions]);

  const selectedDomain = domainSummaries.find((domain) => domain.id === selectedDomainId) ?? null;

  if (selectedInvention) {
    return (
      <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d14]/50 shadow-2xl shadow-black/40 backdrop-blur-3xl">
        <InventionDetail
          invention={selectedInvention}
          onBack={() => onCloseDetails?.()}
          onEnterViewer={onEnterViewer}
        />
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto flex h-full w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d14]/50 shadow-2xl shadow-black/40 backdrop-blur-3xl">
      <div className="h-px w-full bg-white/10" />

      <div className="px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <Layers className="size-4 text-white/70" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-none tracking-tight text-white">Domains</h2>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                Select a field to light the map
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white/70">
            {selectedDomain ? selectedDomain.inventionCount : panelInventions.length}
          </span>
        </div>

        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder="Try: renewable energy in Europe"
          isLoading={isSearching}
        />
      </div>

      <div className="mx-4 h-px bg-white/5" />

      <div className="px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">
            Choose a domain
          </p>
          {selectedDomain && (
            <button
              onClick={() => onSelectDomain(null)}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/70 transition-colors hover:text-blue-100"
            >
              Show all
            </button>
          )}
        </div>

        <div className="grid gap-2">
          {domainSummaries.map((domain) => {
            const isActive = domain.id === selectedDomainId;
            const isUnavailable = domain.inventionCount === 0 && !isActive;

            return (
              <button
                key={domain.id}
                type="button"
                disabled={isUnavailable}
                onClick={() => onSelectDomain(isActive ? null : domain.id)}
                className={`rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-white/18 bg-white/[0.09] shadow-[0_0_24px_-14px_rgba(96,165,250,0.9)]"
                    : isUnavailable
                      ? "border-white/[0.05] bg-white/[0.02] opacity-45"
                      : "border-white/[0.07] bg-white/[0.035] hover:border-white/[0.14] hover:bg-white/[0.055]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="mt-0.5 size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: domain.color }}
                      />
                      <span className="text-[13px] font-semibold text-white/92">{domain.name}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                      {domain.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/65">
                    {domain.inventionCount}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/60">
                    {formatCount(domain.countries.length, "country", "countries")}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/60">
                    {formatCount(domain.states.length, "state", "states")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-4 h-px bg-white/5" />

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-white/75">
          <MapPinned className="size-3.5" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25">
            Geographic coverage
          </p>
        </div>

        {selectedDomain ? (
          <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.07] p-3.5">
            <p className="text-sm font-semibold text-white/90">{selectedDomain.name}</p>
            <p className="mt-1 text-xs leading-5 text-blue-100/75">
              {selectedDomain.description}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/65">
              The globe highlights {formatCount(selectedDomain.countries.length, "country", "countries")}
              {" "}and {formatCount(selectedDomain.states.length, "state or province", "states or provinces")}
              {" "}connected to this domain.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedDomain.places.map((place) => (
                <span
                  key={place}
                  className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-medium text-white/72"
                >
                  {place}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white/78">
              Select a domain to highlight every matching country and state on the map.
            </p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Once a domain is active, this panel will summarize where that wave of invention appears before listing individual entries.
            </p>
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-white/5" />

      <div className="px-4 pb-1.5 pt-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">
          {selectedDomain
            ? `${inventions.length} entr${inventions.length === 1 ? "y" : "ies"} in ${selectedDomain.name}`
            : "Entries appear after domain selection"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {selectedDomain ? (
          <div className="flex flex-col gap-1.5">
            {inventions.map((inv) => (
              <InventionCard
                key={inv.id}
                invention={inv}
                isSelected={focusedInvention?.id === inv.id}
                onClick={() => onSelectInvention(inv.id)}
                onPreview={() => onPreviewInvention?.(inv.id)}
              />
            ))}
            {inventions.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-white/30">No inventions match this domain in the current view.</p>
                <p className="mt-1 text-xs text-white/15">Try a different search or switch domains.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-5 py-12 text-center">
            <div className="max-w-[16rem]">
              <p className="text-sm font-medium text-white/42">
                Choose a domain above to explore the inventions grouped under it.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
