"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type IngestStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface IngestJobState {
  status: IngestStatus;
  runId: string | null;
  inventionId: string | null;
  title: string | null;
  error: string | null;
}

export function useIngestJob() {
  const [state, setState] = useState<IngestJobState>({
    status: "idle",
    runId: null,
    inventionId: null,
    title: null,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (runId: string) => {
      stopPolling();

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/ingest/${runId}/status`);
          if (!res.ok) throw new Error("Status check failed");

          const data = await res.json();

          if (data.isSuccess && data.output) {
            setState((prev) => ({
              ...prev,
              status: "completed",
              inventionId: data.output.inventionId ?? null,
              title: data.output.title ?? null,
            }));
            stopPolling();
          } else if (data.isFailed) {
            setState((prev) => ({
              ...prev,
              status: "failed",
              error: "Pipeline failed. Please try again.",
            }));
            stopPolling();
          } else {
            setState((prev) => ({
              ...prev,
              status: "processing",
            }));
          }
        } catch {
          // Don't fail on transient errors, keep polling
        }
      }, 3000);
    },
    [stopPolling],
  );

  const upload = useCallback(
    async (file: File) => {
      setState({
        status: "uploading",
        runId: null,
        inventionId: null,
        title: null,
        error: null,
      });

      try {
        const formData = new FormData();
        formData.append("pdf", file);

        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Upload failed");
        }

        const data = await res.json();

        setState((prev) => ({
          ...prev,
          status: "queued",
          runId: data.runId,
        }));

        // Start polling
        pollStatus(data.runId);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        }));
      }
    },
    [pollStatus],
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "idle",
      runId: null,
      inventionId: null,
      title: null,
      error: null,
    });
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { ...state, upload, reset };
}
