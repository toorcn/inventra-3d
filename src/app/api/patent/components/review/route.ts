import {
  applyPatentReviewAction,
  type PatentReviewAction,
} from "@/lib/patent-workspace";
import {
  readPatentWorkspaceManifest,
  writePatentWorkspaceManifest,
} from "@/lib/patent-workspace-store";

export const runtime = "nodejs";

type PatentReviewRequest = {
  patentId?: string;
  action?: PatentReviewAction;
};

function isSafePatentId(value: string): boolean {
  return /^[a-z0-9-]+$/i.test(value);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PatentReviewRequest;
    const patentId = body.patentId?.trim();

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    if (!body.action?.componentId || !body.action.type) {
      return Response.json({ error: "Invalid review action" }, { status: 400 });
    }

    const workspace = await readPatentWorkspaceManifest(patentId);
    const updatedWorkspace = applyPatentReviewAction(workspace, body.action);
    await writePatentWorkspaceManifest(updatedWorkspace);

    return Response.json(
      {
        workspace: updatedWorkspace,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown patent review error";
    return Response.json({ error: message }, { status: 500 });
  }
}

