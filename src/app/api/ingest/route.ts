import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { patentPipelineTask } from "@/../../trigger/patent-pipeline";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Simple in-memory rate limiting (per-process, resets on restart)
const uploadTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = uploadTimestamps.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  uploadTimestamps.set(ip, recent);
  return recent.length >= RATE_LIMIT_MAX;
}

function recordUpload(ip: string) {
  const timestamps = uploadTimestamps.get(ip) ?? [];
  timestamps.push(Date.now());
  uploadTimestamps.set(ip, timestamps);
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    // Read and validate PDF header (basic check that it's actually a PDF)
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json(
        { error: "Invalid PDF file" },
        { status: 400 },
      );
    }

    // Sanitize filename and save to temp directory
    const tmpDir = os.tmpdir();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
    const fileName = `patent-${Date.now()}-${sanitizedName}`;
    const pdfPath = path.join(tmpDir, fileName);
    await fs.writeFile(pdfPath, buffer);

    recordUpload(ip);

    // Trigger the pipeline
    const jobId = `job-${Date.now()}`;
    const handle = await tasks.trigger<typeof patentPipelineTask>("patent-pipeline", {
      pdfPath,
      jobId,
      projectRoot: process.cwd(),
    });

    return NextResponse.json({
      jobId,
      runId: handle.id,
      status: "queued",
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 },
    );
  }
}
