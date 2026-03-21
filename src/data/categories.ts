import type { Category, CategoryId } from "@/types";

export const categories: Category[] = [
  { id: "communications", name: "Communications", color: "#2563EB", icon: "Phone" },
  { id: "optics", name: "Optics", color: "#8B5CF6", icon: "Telescope" },
  { id: "mechanical", name: "Mechanical", color: "#F59E0B", icon: "Cog" },
  { id: "consumer-electronics", name: "Consumer Electronics", color: "#EC4899", icon: "Smartphone" },
  { id: "transportation", name: "Transportation", color: "#14B8A6", icon: "Plane" },
  { id: "medicine", name: "Medicine", color: "#10B981", icon: "Cross" },
  { id: "computing", name: "Computing", color: "#06B6D4", icon: "Cpu" },
  { id: "materials", name: "Materials", color: "#F97316", icon: "Layers" },
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
