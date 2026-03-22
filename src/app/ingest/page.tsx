"use client";

import { Panel } from "@/components/ui/Panel";
import { UploadForm } from "@/components/ingest/UploadForm";
import { PipelineProgress } from "@/components/ingest/PipelineProgress";
import { useIngestJob } from "@/hooks/useIngestJob";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function IngestPage() {
  const job = useIngestJob();
  const isIdle = job.status === "idle";
  const isUploading = job.status === "uploading";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <Panel className="w-full max-w-md p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Globe
          </Link>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-gold)]/20">
            <Sparkles className="size-6 text-[var(--accent-gold)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Add Invention from Patent
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Upload a patent PDF and AI will create a 3D model
          </p>
        </div>

        {isIdle || isUploading ? (
          <UploadForm onUpload={job.upload} isUploading={isUploading} />
        ) : (
          <PipelineProgress
            status={job.status}
            inventionId={job.inventionId}
            title={job.title}
            error={job.error}
            onReset={job.reset}
          />
        )}
      </Panel>
    </div>
  );
}
