"use client";

import { inventions as allInventions } from "@/data/inventions";
import type { CategoryId, Invention, UseInventionsReturn } from "@/types";
import { useCallback, useMemo, useState } from "react";

export function useInventions(): UseInventionsReturn {
  const [activeCategories, setActiveCategories] = useState<CategoryId[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInventionId, setSelectedInventionId] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([-3500, 2024]);

  const filtered = useMemo(() => {
    let result = allInventions;

    if (activeCategories.length > 0) {
      result = result.filter((inv) => activeCategories.includes(inv.category));
    }

    if (selectedCountry) {
      result = result.filter((inv) => inv.countryCode === selectedCountry);
    }

    result = result.filter((inv) => inv.year >= yearRange[0] && inv.year <= yearRange[1]);

    return result;
  }, [activeCategories, selectedCountry, yearRange]);

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
    setYearRange([-3500, 2024]);
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
    yearRange,
    setYearRange,
    resetFilters,
  };
}
