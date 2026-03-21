interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-8 border-[3px]",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-white/30 border-t-white ${sizeClasses[size]} ${className}`}
    />
  );
}
