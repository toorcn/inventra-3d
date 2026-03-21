"use client";

interface DemoOverlayProps {
  text: string;
  progress: number;
  onSkip: () => void;
}

export function DemoOverlay({ text, progress, onSkip }: DemoOverlayProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-6 z-30 w-[520px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[var(--bg-panel)] p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-blue-300">Demo Mode</span>
        <button onClick={onSkip} className="text-xs text-[var(--text-secondary)] hover:text-white">Skip</button>
      </div>
      <p className="text-sm text-white">{text}</p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}
