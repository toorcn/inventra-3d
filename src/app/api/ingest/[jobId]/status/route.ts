import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";
import type { patentPipelineTask } from "@/../../trigger/patent-pipeline";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    // The jobId is the Trigger.dev run ID
    const run = await runs.retrieve<typeof patentPipelineTask>(jobId);

    return NextResponse.json({
      jobId,
      status: run.status,
      isCompleted: run.isCompleted,
      isSuccess: Boolean(run.output),
      isFailed: run.status === "FAILED",
      output: run.output ?? null,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check job status" },
      { status: 500 },
    );
  }
}
