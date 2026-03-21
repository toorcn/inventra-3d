import { Spinner } from "./Spinner";

export function GlobeLoader() {
  return (
    <div className="flex h-full min-h-[520px] w-full items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-28 animate-pulse rounded-full border border-blue-500/30 bg-blue-600/10" />
        <Spinner size="lg" />
        <span className="text-sm text-[var(--text-secondary)]">Loading Globe...</span>
      </div>
    </div>
  );
}
