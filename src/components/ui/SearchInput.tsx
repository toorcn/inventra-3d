"use client";

import { Search, X } from "lucide-react";
import { useCallback, type ChangeEvent, type KeyboardEvent } from "react";
import { Spinner } from "./Spinner";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search inventions...",
  isLoading = false,
  className = "",
}: SearchInputProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && onSubmit) {
        onSubmit(value);
      }
    },
    [onSubmit, value],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div
      className={`flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-[var(--text-primary)] transition-all focus-within:border-blue-400/60 focus-within:shadow-[var(--glow-blue)] ${className}`}
    >
      {isLoading ? <Spinner size="sm" /> : <Search className="size-4 text-[var(--text-secondary)]" />}
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
