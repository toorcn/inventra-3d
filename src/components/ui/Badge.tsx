import type { CategoryId } from "@/types";

const categoryLabelMap: Record<CategoryId, string> = {
  communications: "Communications",
  optics: "Optics",
  mechanical: "Mechanical",
  "consumer-electronics": "Consumer Electronics",
};

const categoryColorMap: Record<CategoryId, string> = {
  communications: "#2563EB",
  optics: "#8B5CF6",
  mechanical: "#F59E0B",
  "consumer-electronics": "#EC4899",
};

interface BadgeProps {
  category: CategoryId;
  className?: string;
}

export function Badge({ category, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-primary)] ${className}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: categoryColorMap[category] }}
      />
      {categoryLabelMap[category]}
    </span>
  );
}
