"use client";

import { inventions as allInventions } from "@/data/inventions";
import type { CategoryId, Invention, UseInventionsReturn } from "@/types";
import { useCallback, useMemo, useState } from "react";

export function useInventions(): UseInventionsReturn {
  const [activeCategories, setActiveCategories] = useState<CategoryId[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedInventionId, setFocusedInventionId] = useState<string | null>(null);
  const [activeInventionId, setActiveInventionId] = useState<string | null>(null);
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

  const selectCategory = useCallback((id: CategoryId | null) => {
    setActiveCategories(id ? [id] : []);
  }, []);

  const selectFocusedInvention = useCallback((id: string | null) => {
    setFocusedInventionId(id);
  }, []);

  const selectActiveInvention = useCallback((id: string | null) => {
    setActiveInventionId(id);
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
    setFocusedInventionId(null);
    setActiveInventionId(null);
    setSelectedInventionId(null);
    setSelectedCountry(null);
  }, []);

  const focusedInvention = useMemo<Invention | null>(
    () => allInventions.find((inv) => inv.id === focusedInventionId) ?? null,
    [focusedInventionId],
  );

  const activeInvention = useMemo<Invention | null>(
    () => allInventions.find((inv) => inv.id === activeInventionId) ?? null,
    [activeInventionId],
  );

  const selectedInvention = useMemo<Invention | null>(
    () => allInventions.find((inv) => inv.id === selectedInventionId) ?? null,
    [selectedInventionId],
  );

  return {
    inventions: allInventions,
    filtered,
    activeCategories,
    toggleCategory,
    selectCategory,
    searchQuery,
    setSearchQuery,
    focusedInvention,
    selectFocusedInvention,
    activeInvention,
    selectActiveInvention,
    selectedInvention,
    selectInvention,
    selectedCountry,
    selectCountry,
    resetFilters,
  };
}
