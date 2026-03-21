import type { Category, CategoryId } from "@/types";

export const categories: Category[] = [
  { id: "technology", name: "Technology", color: "#3B82F6", icon: "Cpu" },
  { id: "biology", name: "Biology", color: "#10B981", icon: "Dna" },
  { id: "energy", name: "Energy", color: "#F59E0B", icon: "Zap" },
  { id: "materials", name: "Materials", color: "#8B5CF6", icon: "Gem" },
  { id: "computing", name: "Computing", color: "#EC4899", icon: "Monitor" },
  {
    id: "transportation",
    name: "Transportation",
    color: "#EF4444",
    icon: "Plane",
  },
];

export const categoryColorMap: Record<CategoryId, string> = categories.reduce(
  (acc, category) => {
    acc[category.id] = category.color;
    return acc;
  },
  {} as Record<CategoryId, string>,
);

export function getCategoryById(id: CategoryId): Category {
  const found = categories.find((category) => category.id === id);
  if (!found) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return found;
}
