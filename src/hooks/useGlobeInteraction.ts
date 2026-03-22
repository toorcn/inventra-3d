"use client";

import type { UseInventionsReturn } from "@/types";
import { parseSearchQuery } from "@/lib/search-parser";
import { useState } from "react";

interface CameraController {
  flyToCountry: (code: string) => void;
  flyToInvention: (invention: import("@/types").Invention) => void;
  reset: () => void;
}

export function useGlobeInteraction(
  inventionState: UseInventionsReturn,
  camera: CameraController,
) {
  const [isSearching, setIsSearching] = useState(false);

  const handleCountryClick = (countryCode: string) => {
    inventionState.selectCountry(countryCode);
    inventionState.selectInvention(null);
    camera.flyToCountry(countryCode);
  };

  const handleInventionClick = (inventionId: string) => {
    inventionState.selectInvention(inventionId);
    const found = inventionState.inventions.find((inv) => inv.id === inventionId);
    if (found) camera.flyToInvention(found);
  };

  const handleCardClick = (inventionId: string | null) => {
    inventionState.selectInvention(inventionId);
    if (!inventionId) return;
    const found = inventionState.inventions.find((inv) => inv.id === inventionId);
    if (found) camera.flyToInvention(found);
  };

  const handleSearch = async (query: string) => {
    console.info("[InventorNet][Search][Client] Search requested", {
      query,
    });
    inventionState.setSearchQuery(query);
    setIsSearching(true);

    console.info("[InventorNet][Search][Client] Stage: parsing search query");

    try {
      const filters = await parseSearchQuery(query);

      console.info("[InventorNet][Search][Client] Stage passed: search query parsed", {
        filters,
      });

      inventionState.resetFilters();

      console.info("[InventorNet][Search][Client] Stage: applying parsed filters");

      filters.categories?.forEach((cat) => inventionState.toggleCategory(cat));

      if (filters.country) {
        const match = inventionState.inventions.find(
          (inv) => inv.country.toLowerCase() === filters.country?.toLowerCase(),
        );
        if (match) {
          inventionState.selectCountry(match.countryCode);
          camera.flyToCountry(match.countryCode);
        }
      }

      console.info("[InventorNet][Search][Client] Search flow complete", {
        categoryCount: filters.categories?.length ?? 0,
        country: filters.country ?? null,
        region: filters.region ?? null,
      });
    } catch (error) {
      console.error("[InventorNet][Search][Client] Search flow failed", error);
      throw error;
    } finally {
      setIsSearching(false);
      console.info("[InventorNet][Search][Client] Search loading cleared");
    }
  };

  const handleReset = () => {
    inventionState.resetFilters();
    camera.reset();
  };

  return {
    isSearching,
    handleCountryClick,
    handleInventionClick,
    handleCardClick,
    handleSearch,
    handleReset,
  };
}
