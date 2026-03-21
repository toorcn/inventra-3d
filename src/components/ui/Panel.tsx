import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Panel({ children, className = "", ...props }: PanelProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-xl shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}
