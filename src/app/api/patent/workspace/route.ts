import { readPatentWorkspaceManifest } from "@/lib/patent-workspace-store";

export const runtime = "nodejs";

function isSafePatentId(value: string): boolean {
  return /^[a-z0-9-]+$/i.test(value);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const patentId = searchParams.get("patentId")?.trim();

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    const workspace = await readPatentWorkspaceManifest(patentId);
    return Response.json(workspace, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown patent workspace loading error";
    return Response.json({ error: message }, { status: 500 });
  }
}
