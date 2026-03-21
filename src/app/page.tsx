"use client";

import CesiumGlobe from "@/components/globe/CesiumGlobe";
import TemporosSlider from "@/components/globe/TemporosSlider";
import { DemoMode } from "@/components/demo/DemoMode";
import { SidePanel } from "@/components/discovery/SidePanel";
import type { GlobeCameraController } from "@/components/globe/camera-controller";
import { ViewTransition } from "@/components/transitions/ViewTransition";
import HolographicViewer from "@/components/viewer/HolographicViewer";
import { useInventions } from "@/hooks/useInventions";
import {
  focusInvention,
  focusInventionById,
  resetDiscoveryView,
} from "@/lib/globe-discovery";
import type { Invention, InventionComponent, SearchResult } from "@/types";
import { Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getUniqueCountryCodes(items: Invention[]) {
  return Array.from(new Set(items.map((item) => item.countryCode)));
}

export default function Home() {
  const inventionState = useInventions();
  const globeCameraRef = useRef<GlobeCameraController | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [temporosYear, setTemporosYear] = useState(2025);
  const [searchResults, setSearchResults] = useState<Invention[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Navigation state
  const [viewMode, setViewMode] = useState<"globe" | "viewer">("globe");
  const [viewerInvention, setViewerInvention] = useState<Invention | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Pending transition target (used for switchInvention)
  const [pendingInvention, setPendingInvention] = useState<Invention | null>(null);
  const [pendingMode, setPendingMode] = useState<"globe" | "viewer">("viewer");

  const handleInventionSelect = useCallback((invention: Invention) => {
    setSearchResults(null);
    setTemporosYear((currentYear) => Math.max(currentYear, invention.inventionDate));
    focusInvention(invention, inventionState.selectInvention, globeCameraRef.current);
  }, [inventionState.selectInvention]);

  const handleSidePanelSelect = useCallback((inventionId: string | null) => {
    const focusedInvention = focusInventionById(
      inventionId,
      inventionState.inventions,
      inventionState.selectInvention,
      globeCameraRef.current,
    );
    if (focusedInvention) {
      setTemporosYear((currentYear) => Math.max(currentYear, focusedInvention.inventionDate));
    }
  }, [inventionState.inventions, inventionState.selectInvention]);

  const handleCountrySelect = useCallback((countryCode: string) => {
    setSearchResults(null);
    inventionState.selectInvention(null);
    inventionState.selectCountry(countryCode);
    globeCameraRef.current?.flyToCountries([countryCode]);
  }, [inventionState.selectCountry, inventionState.selectInvention]);

  const handleReset = useCallback(() => {
    setSearchResults(null);
    resetDiscoveryView(
      inventionState.resetFilters,
      setTemporosYear,
      globeCameraRef.current,
    );
  }, [inventionState.resetFilters]);

  const handleToggleCategory = useCallback((categoryId: Invention["category"]) => {
    setSearchResults(null);
    inventionState.toggleCategory(categoryId);
  }, [inventionState.toggleCategory]);

  const handleSearchChange = useCallback((value: string) => {
    inventionState.setSearchQuery(value);

    if (!value.trim()) {
      setSearchResults(null);
    }
  }, [inventionState]);

  const handleSearchSubmit = useCallback(async (query: string) => {
    const normalized = query.trim();
    inventionState.setSearchQuery(query);

    if (!normalized) {
      setSearchResults(null);
      inventionState.selectInvention(null);
      inventionState.selectCountry(null);
      globeCameraRef.current?.resumeAutoRotateAfterDelay(500);
      return;
    }

    setIsSearching(true);
    try {
      const [searchResponse, exaResponse] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: normalized }),
        }),
        fetch("/api/exa-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: normalized }),
        }),
      ]);

      let matchedInventions: Invention[] = [];
      if (searchResponse.ok) {
        const searchData = await searchResponse.json() as SearchResult;
        matchedInventions = searchData.inventions;
        setSearchResults(searchData.inventions);
      }

      if (exaResponse.ok) {
        const exaData = await exaResponse.json() as { inventionId: string | null };
        if (exaData.inventionId) {
          handleSidePanelSelect(exaData.inventionId);
          return;
        }
      }

      inventionState.selectInvention(null);
      inventionState.selectCountry(null);
      const countryCodes = getUniqueCountryCodes(matchedInventions);
      if (countryCodes.length > 0) {
        globeCameraRef.current?.flyToCountries(countryCodes);
      } else {
        globeCameraRef.current?.resumeAutoRotateAfterDelay(500);
      }
    } catch (error) {
      console.error("[Home] search flow error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [handleSidePanelSelect, inventionState]);

  const handleCameraReady = useCallback((controller: GlobeCameraController | null) => {
    globeCameraRef.current = controller;
  }, []);

  useEffect(() => {
    if (!globeCameraRef.current) return;

    if (inventionState.selectedInvention) {
      globeCameraRef.current.flyToInvention(inventionState.selectedInvention);
      return;
    }

    if (inventionState.selectedCountry) {
      globeCameraRef.current.flyToCountries([inventionState.selectedCountry]);
      return;
    }

    if (!searchResults) {
      globeCameraRef.current.resumeAutoRotateAfterDelay(600);
    }
  }, [inventionState.selectedCountry, inventionState.selectedInvention, searchResults]);

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

  const visibleInventions = searchResults ?? inventionState.filtered;
  const highlightedCountryCodes = useMemo(() => {
    if (inventionState.selectedInvention) {
      return [inventionState.selectedInvention.countryCode];
    }

    if (inventionState.selectedCountry) {
      return [inventionState.selectedCountry];
    }

    if (searchResults) {
      return getUniqueCountryCodes(searchResults);
    }

    if (inventionState.activeCategories.length > 0) {
      return getUniqueCountryCodes(inventionState.filtered);
    }

    return [];
  }, [
    inventionState.activeCategories.length,
    inventionState.filtered,
    inventionState.selectedCountry,
    inventionState.selectedInvention,
    searchResults,
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Globe view */}
      {viewMode === "globe" && (
        <>
          <div className="absolute left-4 top-4 z-20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemoRunning(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-sm text-blue-200 backdrop-blur-xl transition-colors hover:bg-blue-500/20"
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
              onCountrySelect={handleCountrySelect}
              onCameraReady={handleCameraReady}
              selectedInventionId={inventionState.selectedInvention?.id}
              highlightedCountryCodes={highlightedCountryCodes}
              temporosYear={temporosYear}
            />
            <TemporosSlider year={temporosYear} onYearChange={setTemporosYear} />
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-20 h-[calc(100vh-2rem)]">
            <SidePanel
              inventions={visibleInventions}
              activeCategories={inventionState.activeCategories}
              onToggleCategory={handleToggleCategory}
              selectedInvention={inventionState.selectedInvention}
              onSelectInvention={handleSidePanelSelect}
              searchValue={inventionState.searchQuery}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              isSearching={isSearching}
              onEnterViewer={handleEnterViewer}
            />
          </div>

          <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[var(--bg-panel)] px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-xl">
            {visibleInventions.length} inventions visible
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
