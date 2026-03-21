"use client";

import Globe from "@/components/globe/Globe";
import { DemoMode } from "@/components/demo/DemoMode";
import { SidePanel } from "@/components/discovery/SidePanel";
import { categories } from "@/data/categories";
import { useGlobeCamera } from "@/hooks/useGlobeCamera";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useInventions } from "@/hooks/useInventions";
import { Play, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

export default function Home() {
  const inventionState = useInventions();
  const globeRef = useRef(undefined);
  const camera = useGlobeCamera(globeRef);
  const interaction = useGlobeInteraction(inventionState, camera);
  const [demoRunning, setDemoRunning] = useState(false);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute left-4 top-4 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDemoRunning(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 backdrop-blur-xl transition-colors hover:bg-cyan-400/20"
          >
            <Play className="size-4" />
            Start Demo
          </button>
          <button
            onClick={interaction.handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:text-white"
          >
            <RotateCcw className="size-4" />
            Reset View
          </button>
        </div>
      </div>

      <DemoMode running={demoRunning} onStop={() => setDemoRunning(false)} />

      <div className="absolute inset-0 pr-[26rem]">
        <Globe
          inventions={inventionState.filtered}
          categories={categories}
          activeCategories={inventionState.activeCategories}
          selectedInventionId={inventionState.selectedInvention?.id ?? null}
          onCountryClick={interaction.handleCountryClick}
          onInventionClick={interaction.handleInventionClick}
          globeRef={globeRef}
        />
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 h-[calc(100vh-2rem)]">
        <SidePanel
          inventions={inventionState.filtered}
          activeCategories={inventionState.activeCategories}
          onToggleCategory={inventionState.toggleCategory}
          selectedInvention={inventionState.selectedInvention}
          onSelectInvention={interaction.handleCardClick}
          searchValue={inventionState.searchQuery}
          onSearchChange={inventionState.setSearchQuery}
          onSearchSubmit={interaction.handleSearch}
          isSearching={interaction.isSearching}
        />
      </div>
      <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-xl">
        {inventionState.filtered.length} inventions visible
      </div>
    </main>
  );
}
