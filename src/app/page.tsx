"use client";

import CesiumGlobe from "@/components/globe/CesiumGlobe";
import TemporosSlider from "@/components/globe/TemporosSlider";
import { DemoMode } from "@/components/demo/DemoMode";
import { SidePanel } from "@/components/discovery/SidePanel";
import { useInventions } from "@/hooks/useInventions";
import type { Invention } from "@/types";
import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const inventionState = useInventions();
  const [demoRunning, setDemoRunning] = useState(false);
  const [temporosYear, setTemporosYear] = useState(2025);

  const handleInventionSelect = (invention: Invention) => {
    inventionState.selectInvention(invention.id);
  };

  const handleReset = () => {
    inventionState.resetFilters();
    setTemporosYear(2025);
  };

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
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:text-white"
          >
            <RotateCcw className="size-4" />
            Reset View
          </button>
        </div>
      </div>

      <DemoMode running={demoRunning} onStop={() => setDemoRunning(false)} />

      <div className="absolute inset-0 pr-[26rem]">
        <CesiumGlobe
          onInventionSelect={handleInventionSelect}
          selectedInventionId={inventionState.selectedInvention?.id}
          temporosYear={temporosYear}
        />
        <TemporosSlider year={temporosYear} onYearChange={setTemporosYear} />
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 h-[calc(100vh-2rem)]">
        <SidePanel
          inventions={inventionState.filtered}
          activeCategories={inventionState.activeCategories}
          onToggleCategory={inventionState.toggleCategory}
          selectedInvention={inventionState.selectedInvention}
          onSelectInvention={(id) => inventionState.selectInvention(id)}
          searchValue={inventionState.searchQuery}
          onSearchChange={inventionState.setSearchQuery}
          onSearchSubmit={(q) => inventionState.setSearchQuery(q)}
          isSearching={false}
        />
      </div>
      <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-xl">
        {inventionState.filtered.length} inventions visible
      </div>
    </main>
  );
}
