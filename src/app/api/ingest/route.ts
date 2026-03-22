import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { patentPipelineTask } from "@/../../trigger/patent-pipeline";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  try {
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

    // Save to temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = os.tmpdir();
    const fileName = `patent-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const pdfPath = path.join(tmpDir, fileName);
    await fs.writeFile(pdfPath, buffer);

    // Trigger the pipeline
    const jobId = `job-${Date.now()}`;
    const handle = await tasks.trigger<typeof patentPipelineTask>("patent-pipeline", {
      pdfPath,
      jobId,
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
