import type { CategoryId } from "@/types";

const categoryLabelMap: Record<CategoryId, string> = {
  technology: "Technology",
  biology: "Biology",
  energy: "Energy",
  materials: "Materials",
  computing: "Computing",
  transportation: "Transportation",
  other: "Other",
};

const categoryColorMap: Record<CategoryId, string> = {
  technology: "#3B82F6",
  biology: "#10B981",
  energy: "#F59E0B",
  materials: "#8B5CF6",
  computing: "#EC4899",
  transportation: "#EF4444",
  other: "#9CA3AF",
};

interface BadgeProps {
  category: CategoryId;
  className?: string;
}

export function Badge({ category, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-gold)] bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-primary)] ${className}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: categoryColorMap[category] }}
      />
      {categoryLabelMap[category]}
    </span>
  );
}
