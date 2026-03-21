"use client";

import {
  ArrowLeft,
  Check,
  FileImage,
  GitMerge,
  Layers3,
  PackageSearch,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type {
  PatentAssetKind,
  PatentComponentRecord,
  PatentReviewAction,
  PatentWorkspaceManifest,
} from "@/lib/patent-workspace";

type WorkspaceResponse = {
  workspace: PatentWorkspaceManifest;
};

function kindLabel(kind: PatentAssetKind): string {
  if (kind === "full_product") {
    return "Full Product";
  }
  if (kind === "subassembly") {
    return "Subassembly";
  }
  return "Component";
}

function StepCard({
  step,
  title,
  detail,
}: {
  step: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-cyan-300">{step}</div>
      <div className="text-base font-semibold text-white">{title}</div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "border-white/10 bg-white/5 text-[var(--text-secondary)]",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    danger: "border-red-400/30 bg-red-500/10 text-red-200",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>
      {label}
    </span>
  );
}

export default function PatentExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [patentIdInput, setPatentIdInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<PatentWorkspaceManifest | null>(null);
  const [reviewLoadingById, setReviewLoadingById] = useState<Record<string, boolean>>({});
  const [generationLoadingById, setGenerationLoadingById] = useState<Record<string, boolean>>({});
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (workspace || typeof window === "undefined") {
      return;
    }

    const patentId = new URLSearchParams(window.location.search).get("patentId");
    if (!patentId) {
      return;
    }

    setIsLoadingWorkspace(true);
    setError(null);

    fetch(`/patents/${patentId}/manifest.json?ts=${Date.now()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load the saved patent workspace.");
        }
        const payload = (await response.json()) as PatentWorkspaceManifest;
        setWorkspace(payload);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unknown workspace loading error");
      })
      .finally(() => {
        setIsLoadingWorkspace(false);
      });
  }, [workspace]);

  const pendingComponents = useMemo(
    () => workspace?.componentLibrary.filter((component) => component.reviewStatus === "pending") ?? [],
    [workspace],
  );

  const approvedComponents = useMemo(
    () => workspace?.componentLibrary.filter((component) => component.reviewStatus === "approved") ?? [],
    [workspace],
  );

  const secondaryComponents = useMemo(
    () =>
      workspace?.componentLibrary.filter(
        (component) => component.reviewStatus === "redundant" || component.reviewStatus === "skipped",
      ) ?? [],
    [workspace],
  );

  const sortedFigures = useMemo(
    () => [...(workspace?.figures ?? [])].sort((a, b) => a.pageNumber - b.pageNumber),
    [workspace],
  );

  function syncWorkspace(payload: PatentWorkspaceManifest) {
    setWorkspace(payload);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("patentId", payload.patentId);
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (patentIdInput.trim()) {
        formData.append("patentId", patentIdInput.trim());
      }

      const response = await fetch("/api/patent/extract", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as PatentWorkspaceManifest | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Patent extraction failed.");
      }

      syncWorkspace(payload as PatentWorkspaceManifest);
      setMergeTargets({});
    } catch (submitError) {
      setWorkspace(null);
      setError(submitError instanceof Error ? submitError.message : "Unknown extraction error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReviewAction(action: PatentReviewAction) {
    if (!workspace) {
      return;
    }

    setReviewLoadingById((current) => ({ ...current, [action.componentId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/patent/components/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patentId: workspace.patentId,
          action,
        }),
      });

      const payload = (await response.json()) as WorkspaceResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Patent review action failed.");
      }

      syncWorkspace((payload as WorkspaceResponse).workspace);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unknown review action error");
    } finally {
      setReviewLoadingById((current) => ({ ...current, [action.componentId]: false }));
    }
  }

  async function handleGenerateComponent(componentId: string) {
    if (!workspace) {
      return;
    }

    setGenerationLoadingById((current) => ({ ...current, [componentId]: true }));
    setError(null);

    try {
      const response = await fetch("/api/patent/components/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patentId: workspace.patentId,
          componentId,
        }),
      });

      const payload = (await response.json()) as WorkspaceResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Component generation failed.");
      }

      syncWorkspace((payload as WorkspaceResponse).workspace);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unknown component generation error");
    } finally {
      setGenerationLoadingById((current) => ({ ...current, [componentId]: false }));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Globe
        </Link>
        <h1 className="text-xl font-semibold md:text-2xl">Patent Figure Extractor (POC)</h1>
      </div>

      <Panel className="mb-6 overflow-hidden">
        <div className="grid gap-6 p-4 md:grid-cols-[1.15fr_0.85fr] md:p-6">
          <div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Turn a patent PDF into a reviewed component asset library: extract source figures, normalize repeated
              parts into canonical components, preserve functional patent context, and generate isolated realistic
              renders for the approved pieces you want to keep.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Patent PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[var(--text-secondary)]">Patent ID (optional)</span>
                <input
                  type="text"
                  value={patentIdInput}
                  onChange={(event) => setPatentIdInput(event.target.value)}
                  placeholder="e.g. us-ballpoint-pen"
                  className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              </label>

              <Button type="submit" size="lg" loading={isSubmitting} className="md:w-56" disabled={!file}>
                <Upload className="size-4" />
                Extract Components
              </Button>
            </form>

            <div className="mt-3 text-xs text-[var(--text-secondary)]">
              Files are persisted under{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">public/patents/&lt;patent-id&gt;</code>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-1">
            <StepCard
              step="Step 1"
              title="Extract Source Evidence"
              detail="Detect figure crops and raw candidate parts from the patent pages."
            />
            <StepCard
              step="Step 2"
              title="Review Canonical Components"
              detail="Approve, merge, skip, or mark redundant candidates before generation."
            />
            <StepCard
              step="Step 3"
              title="Generate Realistic Assets"
              detail="Create isolated studio renders only for approved components."
            />
          </div>
        </div>
      </Panel>

      {isLoadingWorkspace ? (
        <Panel className="mb-6 p-4 text-sm text-[var(--text-secondary)]">Loading saved patent workspace...</Panel>
      ) : null}

      {workspace ? (
        <>
          <Panel className="mb-6 p-4 md:p-6">
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Patent ID</div>
                <div className="mt-1 font-medium text-white">{workspace.patentId}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Pages</div>
                <div className="mt-1 font-medium text-white">
                  {workspace.processedPages} / {workspace.totalPages}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Source Figures</div>
                <div className="mt-1 font-medium text-white">{workspace.stats.figureCount}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Raw Candidates</div>
                <div className="mt-1 font-medium text-white">{workspace.stats.rawCandidateCount}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Canonical Components</div>
                <div className="mt-1 font-medium text-white">{workspace.stats.libraryCount}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                <div className="text-xs uppercase tracking-wide text-cyan-100/80">Pending Review</div>
                <div className="mt-1 text-2xl font-semibold text-white">{workspace.stats.pendingCount}</div>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">Approved</div>
                <div className="mt-1 text-2xl font-semibold text-white">{workspace.stats.approvedCount}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Generated</div>
                <div className="mt-1 text-2xl font-semibold text-white">{workspace.stats.generatedCount}</div>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                <div className="text-xs uppercase tracking-wide text-amber-100/80">Skipped / Redundant</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {workspace.stats.skippedCount + workspace.stats.redundantCount}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <a href={workspace.paths.manifestPath} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">
                Open manifest JSON
              </a>
              <span className="text-white/20">•</span>
              <a href={workspace.paths.textPath} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">
                Open extracted text
              </a>
            </div>

            {workspace.warnings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="mb-1 font-medium">Warnings</p>
                <ul className="list-disc space-y-1 pl-5">
                  {workspace.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel className="mb-6 p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <PackageSearch className="size-5 text-cyan-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Step 2: Review Queue</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Review deduped component clusters before spending generation quota.
                </p>
              </div>
            </div>

            {pendingComponents.length === 0 ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                No pending components left. The review queue is clear.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {pendingComponents.map((component) => {
                  const mergeTargetOptions = workspace.componentLibrary.filter(
                    (option) => option.id !== component.id && option.reviewStatus !== "redundant",
                  );
                  const primaryEvidence = component.evidence[0];

                  return (
                    <div key={component.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{component.canonicalName}</h3>
                            <StatusBadge label={kindLabel(component.kind)} />
                            <StatusBadge label={`${Math.round(component.confidence * 100)}% confidence`} />
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">{component.summary}</p>
                        </div>
                        {primaryEvidence ? (
                          <img
                            src={primaryEvidence.imagePath}
                            alt={component.canonicalName}
                            className="h-20 w-20 rounded-xl border border-white/10 bg-black/20 object-contain"
                          />
                        ) : null}
                      </div>

                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                            What It Is
                          </div>
                          <p className="text-[13px] text-white">{component.summary}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                            How It Works
                          </div>
                          <p className="text-[13px] text-white">{component.functionDescription}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {component.refNumbers.length > 0 ? (
                          component.refNumbers.map((refNumber) => (
                            <StatusBadge key={`${component.id}-${refNumber}`} label={`Ref ${refNumber}`} tone="success" />
                          ))
                        ) : (
                          <StatusBadge label="No patent ref number" />
                        )}
                        <StatusBadge label={`${component.evidence.length} evidence image${component.evidence.length === 1 ? "" : "s"}`} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                        {component.evidence.slice(0, 6).map((evidence) => (
                          <span key={evidence.candidateId} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                            {evidence.figureLabel} · p{evidence.pageNumber}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <Button
                          type="button"
                          size="sm"
                          loading={reviewLoadingById[component.id] ?? false}
                          onClick={() => handleReviewAction({ type: "approve", componentId: component.id })}
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={reviewLoadingById[component.id] ?? false}
                          onClick={() => handleReviewAction({ type: "mark_subassembly", componentId: component.id })}
                        >
                          <Layers3 className="size-4" />
                          Subassembly
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={reviewLoadingById[component.id] ?? false}
                          onClick={() => handleReviewAction({ type: "skip", componentId: component.id })}
                        >
                          <X className="size-4" />
                          Skip
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={reviewLoadingById[component.id] ?? false}
                          onClick={() => handleReviewAction({ type: "mark_redundant", componentId: component.id })}
                        >
                          <X className="size-4" />
                          Redundant
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                        <select
                          value={mergeTargets[component.id] ?? ""}
                          onChange={(event) =>
                            setMergeTargets((current) => ({
                              ...current,
                              [component.id]: event.target.value,
                            }))
                          }
                          className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                        >
                          <option value="">Select canonical target to merge into</option>
                          {mergeTargetOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.canonicalName}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-11"
                          disabled={!mergeTargets[component.id]}
                          loading={reviewLoadingById[component.id] ?? false}
                          onClick={() =>
                            handleReviewAction({
                              type: "merge",
                              componentId: component.id,
                              targetComponentId: mergeTargets[component.id],
                            })
                          }
                        >
                          <GitMerge className="size-4" />
                          Merge
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel className="mb-6 p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="size-5 text-cyan-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Step 3: Approved Component Library</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Generate isolated realistic images only for approved canonical components.
                </p>
              </div>
            </div>

            {approvedComponents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[var(--text-secondary)]">
                Approved components will appear here after review.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {approvedComponents.map((component) => {
                  const primaryEvidence = component.evidence[0];

                  return (
                    <div key={component.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                      <div className="border-b border-white/10 bg-black/20 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-white">{component.canonicalName}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{kindLabel(component.kind)}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            loading={generationLoadingById[component.id] ?? false}
                            onClick={() => handleGenerateComponent(component.id)}
                          >
                            <Sparkles className="size-4" />
                            {component.generatedAsset ? "Re-run" : "Generate"}
                          </Button>
                        </div>

                        {component.generatedAsset ? (
                          <a href={component.generatedAsset.outputPath} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={component.generatedAsset.outputPath}
                              alt={`Generated render for ${component.canonicalName}`}
                              className="h-64 w-full rounded-xl border border-white/10 bg-black/30 object-contain"
                            />
                          </a>
                        ) : primaryEvidence ? (
                          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center text-xs text-[var(--text-secondary)]">
                              No realistic render yet. Generate after review to create the clean studio asset.
                            </div>
                            <img
                              src={primaryEvidence.imagePath}
                              alt={`Source evidence for ${component.canonicalName}`}
                              className="h-40 w-full rounded-xl border border-white/10 bg-black/30 object-contain"
                            />
                          </div>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                          <span>{component.generationStatus}</span>
                          {component.generatedAsset ? (
                            <a
                              href={component.generatedAsset.outputPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-300 hover:text-cyan-200"
                            >
                              Open enhanced image
                            </a>
                          ) : null}
                        </div>

                        {component.generationError ? (
                          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
                            {component.generationError}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 p-3 text-sm">
                        <div>
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                            What It Is
                          </div>
                          <p className="text-white">{component.summary}</p>
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                            How It Works
                          </div>
                          <p className="text-white">{component.functionDescription}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <StatusBadge label={`${component.evidence.length} evidence view${component.evidence.length === 1 ? "" : "s"}`} />
                          {component.refNumbers.map((refNumber) => (
                            <StatusBadge key={`${component.id}-${refNumber}`} label={`Ref ${refNumber}`} tone="success" />
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {component.evidence.slice(0, 3).map((evidence) => (
                            <img
                              key={evidence.candidateId}
                              src={evidence.imagePath}
                              alt={`${component.canonicalName} evidence ${evidence.figureLabel}`}
                              className="h-24 w-full rounded-xl border border-white/10 bg-black/30 object-contain"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Panel className="p-4 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <FileImage className="size-5 text-cyan-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Source Figures</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Raw figure evidence is preserved for debugging, provenance, and future assembly work.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedFigures.map((figure) => (
                  <div key={figure.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <a href={figure.imagePath} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={figure.imagePath}
                        alt={`${figure.label} page ${figure.pageNumber}`}
                        className="h-40 w-full bg-black/30 object-contain"
                      />
                    </a>
                    <div className="space-y-2 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-white">{figure.label}</div>
                        <StatusBadge label={`p${figure.pageNumber}`} />
                      </div>
                      <p className="text-[var(--text-secondary)]">{figure.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <StatusBadge label={figure.analysisSource} tone="success" />
                        <StatusBadge label={`${figure.componentDetections.length} detections`} />
                        {figure.cropRegion ? <StatusBadge label="cropped" tone="success" /> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Layers3 className="size-5 text-cyan-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Review Outcomes</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Track what was skipped or merged while keeping the source evidence intact.
                  </p>
                </div>
              </div>

              {secondaryComponents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[var(--text-secondary)]">
                  No skipped or redundant components yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {secondaryComponents.map((component) => (
                    <div key={component.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-white">{component.canonicalName}</div>
                        <StatusBadge
                          label={component.reviewStatus}
                          tone={component.reviewStatus === "redundant" ? "warn" : "default"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{component.summary}</p>
                      {component.mergeTargetId ? (
                        <div className="mt-2 text-xs text-cyan-300">Merged into {component.mergeTargetId}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </main>
  );
}

