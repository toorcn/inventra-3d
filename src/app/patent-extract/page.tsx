"use client";

import { ArrowLeft, FileImage, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

type ExtractedComponent = {
  refNumber: string | null;
  name: string;
};

type ExtractedFigure = {
  id: string;
  filename: string;
  pageNumber: number;
  label: string;
  description: string;
  analysisSource: "vision" | "heuristic";
  failureReason: string | null;
  cropRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string | null;
    confidence?: number;
  } | null;
  components: ExtractedComponent[];
  pageTextSnippet: string;
};

type ExtractResponse = {
  patentId: string;
  outputDirectory: string;
  manifestPath: string;
  textPath: string;
  totalPages: number;
  processedPages: number;
  figureCount: number;
  warnings: string[];
  figures: ExtractedFigure[];
};

type EnhancementResponse = {
  outputPath: string;
  outputFilename: string;
  model: string;
};

type FigureEnhancementState = {
  isSubmitting: boolean;
  error: string | null;
  result: EnhancementResponse | null;
};

export default function PatentExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [patentIdInput, setPatentIdInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [enhancements, setEnhancements] = useState<Record<string, FigureEnhancementState>>({});

  const sortedFigures = useMemo(() => {
    if (!result) {
      return [];
    }
    return [...result.figures].sort((a, b) => a.pageNumber - b.pageNumber);
  }, [result]);

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

      const payload = (await response.json()) as ExtractResponse | { error?: string };
      if (!response.ok) {
        const errorMessage = "error" in payload && payload.error ? payload.error : "Patent extraction failed.";
        throw new Error(errorMessage);
      }

      setResult(payload as ExtractResponse);
      setEnhancements({});
    } catch (submitError) {
      setResult(null);
      setEnhancements({});
      setError(submitError instanceof Error ? submitError.message : "Unknown extraction error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnhanceFigure(figure: ExtractedFigure) {
    if (!result) {
      return;
    }

    setEnhancements((current) => ({
      ...current,
      [figure.id]: {
        isSubmitting: true,
        error: null,
        result: current[figure.id]?.result ?? null,
      },
    }));

    try {
      const response = await fetch("/api/patent/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patentId: result.patentId,
          figureFilename: figure.filename,
          figureLabel: figure.label,
          description: figure.description,
          components: figure.components,
        }),
      });

      const payload = (await response.json()) as EnhancementResponse | { error?: string };
      if (!response.ok) {
        const errorMessage =
          "error" in payload && payload.error ? payload.error : "Patent figure enhancement failed.";
        throw new Error(errorMessage);
      }

      setEnhancements((current) => ({
        ...current,
        [figure.id]: {
          isSubmitting: false,
          error: null,
          result: payload as EnhancementResponse,
        },
      }));
    } catch (enhanceError) {
      setEnhancements((current) => ({
        ...current,
        [figure.id]: {
          isSubmitting: false,
          error: enhanceError instanceof Error ? enhanceError.message : "Unknown enhancement error",
          result: current[figure.id]?.result ?? null,
        },
      }));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-6">
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

      <Panel className="mb-6 p-4 md:p-6">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Upload a patent PDF to extract figure screenshots, inferred component labels, and text context into
          <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">public/patents/&lt;patent-id&gt;</code>
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
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
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className="md:w-52" disabled={!file}>
            <Upload className="size-4" />
            Extract Figures
          </Button>
        </form>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}
      </Panel>

      {result ? (
        <>
          <Panel className="mb-6 p-4 md:p-6">
            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div>
                <div className="text-[var(--text-secondary)]">Patent ID</div>
                <div className="font-medium text-white">{result.patentId}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Pages</div>
                <div className="font-medium text-white">
                  {result.processedPages} / {result.totalPages}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Figures</div>
                <div className="font-medium text-white">{result.figureCount}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Manifest</div>
                <a href={result.manifestPath} target="_blank" rel="noreferrer" className="font-medium text-cyan-300 hover:text-cyan-200">
                  Open JSON
                </a>
              </div>
            </div>

            {result.warnings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="mb-1 font-medium">Warnings</p>
                <ul className="list-disc space-y-1 pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedFigures.map((figure) => {
              const enhancement = enhancements[figure.id];

              return (
                <Panel key={figure.id} className="overflow-hidden">
                  <a
                    href={`${result.outputDirectory}/${figure.filename}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={`${result.outputDirectory}/${figure.filename}`}
                      alt={`${figure.label} on page ${figure.pageNumber}`}
                      className="h-56 w-full bg-black/30 object-contain"
                    />
                  </a>

                  <div className="border-y border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">Realistic Component Render</div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Turn this extracted figure into a higher-fidelity product-style image.
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        loading={enhancement?.isSubmitting ?? false}
                        onClick={() => handleEnhanceFigure(figure)}
                      >
                        <Sparkles className="size-4" />
                        {enhancement?.result ? "Re-run" : "Enhance"}
                      </Button>
                    </div>

                    {enhancement?.error ? (
                      <div className="mb-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
                        {enhancement.error}
                      </div>
                    ) : null}

                    {enhancement?.result ? (
                      <div className="space-y-2">
                        <a href={enhancement.result.outputPath} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={enhancement.result.outputPath}
                            alt={`Enhanced render for ${figure.label}`}
                            className="h-56 w-full rounded-xl border border-white/10 bg-black/30 object-contain"
                          />
                        </a>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                          <span>{enhancement.result.model}</span>
                          <a
                            href={enhancement.result.outputPath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            Open enhanced image
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 text-center text-xs text-[var(--text-secondary)]">
                        No enhanced render yet. Click Enhance to generate a realistic component image below the
                        patent crop.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-white">{figure.label}</div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                        page {figure.pageNumber}
                      </span>
                    </div>

                    <p className="text-[var(--text-secondary)]">{figure.description}</p>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                        {figure.analysisSource}
                      </span>
                      {figure.failureReason ? <span className="text-amber-200">{figure.failureReason}</span> : null}
                      {figure.cropRegion ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                          cropped
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-[var(--text-secondary)]">Components</p>
                      <ul className="space-y-1 text-sm text-white">
                        {figure.components.length > 0 ? (
                          figure.components.slice(0, 8).map((component) => (
                            <li key={`${figure.id}-${component.refNumber ?? "none"}-${component.name}`}>
                              {component.refNumber ? `${component.refNumber}: ` : ""}
                              {component.name}
                            </li>
                          ))
                        ) : (
                          <li className="text-[var(--text-secondary)]">No component labels extracted.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-[var(--text-secondary)]">
                      <div className="mb-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide">
                        <FileImage className="size-3" />
                        Image file
                      </div>
                      <div>{figure.filename}</div>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </>
      ) : null}
    </main>
  );
}
