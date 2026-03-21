import { categoryColorMap } from "@/data/categories";
import type { Category, GlobeMarker, Invention } from "@/types";

export function inventionsToMarkers(inventions: Invention[], _categories: Category[]): GlobeMarker[] {
  return inventions.map((invention) => ({
    id: invention.id,
    lat: invention.location.lat,
    lng: invention.location.lng,
    name: invention.title,
    category: invention.category,
    color: categoryColorMap[invention.category],
    size: invention.hasModel ? 0.35 : 0.22,
  }));
}
