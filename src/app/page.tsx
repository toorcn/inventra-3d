"use client";

import CesiumGlobe from "@/components/globe/CesiumGlobe";
import TemporosSlider from "@/components/globe/TemporosSlider";
import { DemoMode } from "@/components/demo/DemoMode";
import { SidePanel } from "@/components/discovery/SidePanel";
import { ViewTransition } from "@/components/transitions/ViewTransition";
import HolographicViewer from "@/components/viewer/HolographicViewer";
import { useInventions } from "@/hooks/useInventions";
import type { Invention, InventionComponent } from "@/types";
import { Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const inventionState = useInventions();
  const [demoRunning, setDemoRunning] = useState(false);
  const [temporosYear, setTemporosYear] = useState(2025);

  // Navigation state
  const [viewMode, setViewMode] = useState<"globe" | "viewer">("globe");
  const [viewerInvention, setViewerInvention] = useState<Invention | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Pending transition target (used for switchInvention)
  const [pendingInvention, setPendingInvention] = useState<Invention | null>(null);
  const [pendingMode, setPendingMode] = useState<"globe" | "viewer">("viewer");

  const handleInventionSelect = (invention: Invention) => {
    inventionState.selectInvention(invention.id);
  };

  const handleReset = () => {
    inventionState.resetFilters();
    setTemporosYear(2025);
  };

  // Enter the holographic viewer with a fade transition
  const handleEnterViewer = useCallback((invention: Invention) => {
    setPendingInvention(invention);
    setPendingMode("viewer");
    setIsTransitioning(true);
  }, []);

  // Exit the holographic viewer back to the globe
  const handleExitViewer = useCallback(() => {
    setPendingInvention(null);
    setPendingMode("globe");
    setIsTransitioning(true);
  }, []);

  // Called at the midpoint of the transition (800ms, fully black)
  const handleTransitionEnd = useCallback(() => {
    if (pendingMode === "viewer" && pendingInvention) {
      setViewerInvention(pendingInvention);
      setViewMode("viewer");
    } else {
      setViewMode("globe");
      setViewerInvention(null);
    }
    setIsTransitioning(false);
  }, [pendingMode, pendingInvention]);

  // Listen for "switchInvention" CustomEvent dispatched by number keys in the viewer
  useEffect(() => {
    const handleSwitchInvention = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      const target = inventionState.inventions.find((inv) => inv.id === detail.id);
      if (!target) return;
      if (target.id === viewerInvention?.id) return;
      handleEnterViewer(target);
    };

    window.addEventListener("switchInvention", handleSwitchInvention);
    return () => window.removeEventListener("switchInvention", handleSwitchInvention);
  }, [inventionState.inventions, viewerInvention, handleEnterViewer]);

  const handleComponentSelect = (_component: InventionComponent | null) => {
    // Future: handle component selection in viewer
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Globe view */}
      {viewMode === "globe" && (
        <>
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
              onEnterViewer={handleEnterViewer}
            />
          </div>

          <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-xl">
            {inventionState.filtered.length} inventions visible
          </div>
        </>
      )}

      {/* Holographic viewer */}
      {viewMode === "viewer" && viewerInvention && (
        <HolographicViewer
          invention={viewerInvention}
          onBack={handleExitViewer}
          onComponentSelect={handleComponentSelect}
        />
      )}

      {/* Cinematic fade-to-black transition overlay */}
      <ViewTransition
        isTransitioning={isTransitioning}
        onTransitionEnd={handleTransitionEnd}
      />
    </main>
  );
}
