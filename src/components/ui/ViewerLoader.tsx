import { Spinner } from "./Spinner";

export function ViewerLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-16 animate-pulse rounded-lg border border-blue-400/30 bg-blue-500/10" />
        <Spinner size="lg" />
        <span className="text-sm text-[var(--text-secondary)]">Loading 3D Viewer...</span>
      </div>
    </div>
  );
}
