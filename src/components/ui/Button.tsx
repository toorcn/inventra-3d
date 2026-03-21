import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[var(--glow-blue)] hover:brightness-110",
  secondary:
    "bg-white/10 border border-white/15 text-[var(--text-primary)] hover:bg-white/20",
  ghost: "bg-transparent border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10",
};

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 ${sizeClasses[size]} ${variantClasses[variant]} ${
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
