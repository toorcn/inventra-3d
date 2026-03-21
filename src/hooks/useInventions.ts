"use client";

import { inventions as allInventions } from "@/data/inventions";
import type { CategoryId, Invention, UseInventionsReturn } from "@/types";
import { useCallback, useMemo, useState } from "react";

export function useInventions(): UseInventionsReturn {
  const [activeCategories, setActiveCategories] = useState<CategoryId[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInventionId, setSelectedInventionId] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = allInventions;

    if (activeCategories.length > 0) {
      result = result.filter((inv) => activeCategories.includes(inv.category));
    }

    if (selectedCountry) {
      result = result.filter((inv) => inv.countryCode === selectedCountry);
    }

    return result;
  }, [activeCategories, selectedCountry]);

  const toggleCategory = useCallback((id: CategoryId) => {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const selectInvention = useCallback((id: string | null) => {
    setSelectedInventionId(id);
  }, []);

  const selectCountry = useCallback((code: string | null) => {
    setSelectedCountry(code);
  }, []);

  const resetFilters = useCallback(() => {
    setActiveCategories([]);
    setSearchQuery("");
    setSelectedInventionId(null);
    setSelectedCountry(null);
  }, []);

  const selectedInvention = useMemo<Invention | null>(
    () => allInventions.find((inv) => inv.id === selectedInventionId) ?? null,
    [selectedInventionId],
  );

  return {
    inventions: allInventions,
    filtered,
    activeCategories,
    toggleCategory,
    searchQuery,
    setSearchQuery,
    selectedInvention,
    selectInvention,
    selectedCountry,
    selectCountry,
    resetFilters,
  };
}
