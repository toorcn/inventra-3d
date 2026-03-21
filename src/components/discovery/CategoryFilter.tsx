"use client";

import { categories } from "@/data/categories";
import type { CategoryId } from "@/types";

interface CategoryFilterProps {
  activeCategories: CategoryId[];
  onToggle: (id: CategoryId) => void;
}

export function CategoryFilter({ activeCategories, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => {
        const isActive = activeCategories.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all duration-200 ${
              isActive
                ? "shadow-sm"
                : "border-white/8 bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/15"
            }`}
            style={
              isActive
                ? {
                    backgroundColor: cat.color + "22",
                    borderColor: cat.color + "55",
                    color: cat.color,
                    boxShadow: `0 0 10px -3px ${cat.color}55`,
                  }
                : undefined
            }
          >
            <span
              className="size-1.5 rounded-full shrink-0 transition-all duration-200"
              style={{ backgroundColor: isActive ? cat.color : cat.color + "77" }}
            />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
