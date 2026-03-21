import type { Category, CategoryId } from "@/types";

export const categories: Category[] = [
  {
    id: "communications",
    name: "Communications",
    description: "Signals, media, and systems that move information between people and places.",
    color: "#2563EB",
    icon: "Phone",
  },
  {
    id: "optics",
    name: "Optics",
    description: "Instruments that shape sight, magnification, imaging, and the study of light.",
    color: "#8B5CF6",
    icon: "Telescope",
  },
  {
    id: "mechanical",
    name: "Mechanical",
    description: "Machines, engines, and mechanisms that convert motion, force, and precision into work.",
    color: "#F59E0B",
    icon: "Cog",
  },
  {
    id: "consumer-electronics",
    name: "Consumer Electronics",
    description: "Personal devices that bring computation, playback, and interfaces into everyday life.",
    color: "#EC4899",
    icon: "Smartphone",
  },
  {
    id: "transportation",
    name: "Transportation",
    description: "Technologies that move people and goods farther, faster, and more reliably.",
    color: "#14B8A6",
    icon: "Plane",
  },
  {
    id: "medicine",
    name: "Medicine",
    description: "Treatments, diagnostics, and tools that extend health, safety, and survival.",
    color: "#10B981",
    icon: "Cross",
  },
  {
    id: "computing",
    name: "Computing",
    description: "Systems for processing information, logic, and software-driven capability.",
    color: "#06B6D4",
    icon: "Cpu",
  },
  {
    id: "materials",
    name: "Materials",
    description: "New substances and production methods that unlock stronger, lighter, or more useful objects.",
    color: "#F97316",
    icon: "Layers",
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
