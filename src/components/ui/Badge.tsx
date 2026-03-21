import { getCategoryById } from "@/data/categories";
import type { CategoryId } from "@/types";

interface BadgeProps {
  category: CategoryId;
  className?: string;
}

export function Badge({ category, className = "" }: BadgeProps) {
  const meta = getCategoryById(category);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-primary)] ${className}`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.name}
    </span>
  );
}
