"use client";

import Globe from "@/components/globe/Globe";
import { CountryHoverPanel } from "@/components/globe/CountryHoverPanel";
import { DemoMode } from "@/components/demo/DemoMode";
import { RandomDiscovery } from "@/components/discovery/RandomDiscovery";
import { SidePanel } from "@/components/discovery/SidePanel";
import { categories } from "@/data/categories";
import { useGlobeCamera } from "@/hooks/useGlobeCamera";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useInventions } from "@/hooks/useInventions";
import Link from "next/link";
import type { CountryHoverData, Invention } from "@/types";
import { Play, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { InventionDetail } from "@/components/discovery/InventionDetail";

export default function Home() {
  const inventionState = useInventions();
  const globeRef = useRef(undefined);
  const camera = useGlobeCamera(globeRef);
  const interaction = useGlobeInteraction(inventionState, camera);
  const [demoRunning, setDemoRunning] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<CountryHoverData | null>(null);
  const [pinnedCountry, setPinnedCountry] = useState<CountryHoverData | null>(null);
  const [isRandomDiscoveryOpen, setIsRandomDiscoveryOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleViewOnGlobe = useCallback(
    (invention: Invention) => {
      interaction.handleInventionClick(invention.id);
    },
    [interaction],
  );

  const handleCountryHover = useCallback((data: CountryHoverData | null) => {
    // Only update if we have new data (persistence)
    if (data) {
      setHasInteracted(true);
      setHoveredCountry(data);
    }
  }, []);

  const handleCountryClick = useCallback((code: string, name: string) => {
    // 1. Move camera
    interaction.handleCountryClick(code);
    
    // 2. Find inventions for this country to Pin the panel
    const countryInventions = inventionState.inventions.filter(inv => inv.countryCode === code);
    
    setPinnedCountry({
      countryCode: code,
      country: countryInventions.length > 0 ? countryInventions[0].country : name,
      inventions: countryInventions
    });

    if (countryInventions.length > 0) {
      setHasInteracted(true);
    }

    setHoveredCountry(null);
  }, [interaction, inventionState.inventions]);

  const handleHoverPanelInventionClick = useCallback(
    (id: string) => {
      interaction.handleCardClick(id);
    },
    [interaction],
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Branding — top-left */}
      <div className="absolute left-5 top-5 z-30 select-none">
        <h1
          className="text-3xl font-bold uppercase tracking-[0.25em] text-[var(--accent-gold)]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          INVENTRA
        </h1>
        <p
          className="mt-2 text-sm tracking-[0.1em] text-[var(--text-secondary)] opacity-80"
          style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 400 }}
        >
          Explore the world&apos;s most impactful inventions through time.
        </p>
      </div>

      {/* Action buttons — top-left below branding */}
      <div className="absolute left-5 top-20 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDemoRunning(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-gold)] bg-[var(--accent-gold)]/10 px-3 py-2 text-sm text-[var(--accent-gold-light)] backdrop-blur-xl transition-colors hover:bg-[var(--accent-gold)]/20"
          >
            <Play className="size-4" />
            Quick Tour
          </button>
          <button
            onClick={() => {
              interaction.handleReset();
              setPinnedCountry(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="size-4" />
            Reset View
          </button>
          <Link
            href="/patent-extract"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:text-white"
          >
            Patent Extractor
          </Link>
        </div>
      </div>

      <DemoMode running={demoRunning} onStop={() => setDemoRunning(false)} />

      {/* Random Discovery — top-right */}
      <div className="absolute right-5 top-5 z-30">
        <RandomDiscovery 
          onViewOnGlobe={handleViewOnGlobe} 
          onOpen={() => setIsRandomDiscoveryOpen(true)}
          onClose={() => setIsRandomDiscoveryOpen(false)}
        />
      </div>

      <Globe
        inventions={inventionState.filtered}
        categories={categories}
        activeCategories={inventionState.activeCategories}
        selectedInventionId={inventionState.selectedInvention?.id ?? null}
        onCountryClick={handleCountryClick}
        onInventionClick={interaction.handleInventionClick}
        onCountryHover={handleCountryHover}
        globeRef={globeRef}
        hoveredCountry={hoveredCountry}
      />


      {/* Side panel — LEFT side (Fixed Search/List) */}
      {!isRandomDiscoveryOpen && (
        <div className="pointer-events-none absolute left-4 top-28 z-20 h-[calc(100vh-8rem)]">
          <SidePanel
            inventions={inventionState.filtered}
            activeCategories={inventionState.activeCategories}
            onToggleCategory={inventionState.toggleCategory}
            onSelectInvention={interaction.handleCardClick}
            searchValue={inventionState.searchQuery}
            onSearchChange={inventionState.setSearchQuery}
            onSearchSubmit={interaction.handleSearch}
            isSearching={interaction.isSearching}
          />
        </div>
      )}

      {/* Country discovery panel — cosmic space right of side panel */}
      {!isRandomDiscoveryOpen && hasInteracted && (
        <CountryHoverPanel
          data={pinnedCountry ?? hoveredCountry}
          onInventionClick={handleHoverPanelInventionClick}
          isPinned={!!pinnedCountry}
          onClose={() => {
            setPinnedCountry(null);
            interaction.handleReset();
          }}
        />
      )}

      {/* Invention Detail — RIGHT side */}
      {inventionState.selectedInvention && (
        <div className="pointer-events-none absolute right-4 top-28 z-20 h-[calc(100vh-8rem)] w-80">
          <aside className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-gold)] bg-[var(--bg-panel)] shadow-2xl backdrop-blur-xl transition-all animate-in fade-in slide-in-from-right-4">
            <InventionDetail
              invention={inventionState.selectedInvention}
              onBack={() => interaction.handleCardClick(null)}
            />
          </aside>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-[var(--border-gold)] bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-xl">
        {inventionState.filtered.length} inventions visible
      </div>
    </main>
  );
}
