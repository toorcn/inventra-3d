"use client";

import { categories } from "@/data/categories";
import type { CategoryId } from "@/types";

interface CategoryFilterProps {
  activeCategories: CategoryId[];
  onToggle: (id: CategoryId) => void;
}

export function CategoryFilter({ activeCategories, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = activeCategories.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? "border-transparent text-white shadow-md"
                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
            }`}
            style={isActive ? { backgroundColor: cat.color + "30", borderColor: cat.color, color: cat.color } : undefined}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
