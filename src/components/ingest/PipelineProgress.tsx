"use client";

import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { IngestStatus } from "@/hooks/useIngestJob";

interface PipelineProgressProps {
  status: IngestStatus;
  inventionId: string | null;
  title: string | null;
  error: string | null;
  onReset: () => void;
}

const STEPS = [
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing patent..." },
  { key: "completed", label: "Complete!" },
];

function getActiveStepIndex(status: IngestStatus): number {
  switch (status) {
    case "queued":
      return 0;
    case "processing":
      return 1;
    case "completed":
      return 2;
    case "failed":
      return -1;
    default:
      return -1;
  }
}

export function PipelineProgress({
  status,
  inventionId,
  title,
  error,
  onReset,
}: PipelineProgressProps) {
  const activeStep = getActiveStepIndex(status);

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <XCircle className="size-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Pipeline Failed
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {error ?? "An unexpected error occurred."}
          </p>
        </div>
        <Button variant="secondary" onClick={onReset}>
          Try Again
        </Button>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="size-12 text-green-400" />
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Invention Created!
          </h3>
          {title && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{title}</p>
          )}
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Restart the dev server to see it on the globe.
          </p>
        </div>
        <div className="flex gap-3">
          {inventionId && (
            <Link href={`/invention/${inventionId}`}>
              <Button variant="primary">
                View Invention <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
          <Button variant="secondary" onClick={onReset}>
            Upload Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-center">
        <Spinner size="lg" />
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
                isActive
                  ? "bg-[var(--accent-gold)]/10 text-[var(--text-primary)]"
                  : isDone
                    ? "text-green-400"
                    : "text-[var(--text-secondary)]/50"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : isActive ? (
                <Spinner size="sm" />
              ) : (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                  {i + 1}
                </span>
              )}
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-[var(--text-secondary)]">
        This may take several minutes. You can leave this page and come back later.
      </p>
    </div>
  );
}
