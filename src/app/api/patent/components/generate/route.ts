import { generatePatentComponentImageVariant } from "@/lib/patent-component-image-generator";
import {
  updatePatentComponentImageGeneration,
  type PatentComponentRecord,
  type PatentGeneratedImageAsset,
  type PatentImageVariant,
  type PatentWorkspaceManifest,
} from "@/lib/patent-workspace";
import { readPatentWorkspaceManifest, writePatentWorkspaceManifest } from "@/lib/patent-workspace-store";

export const runtime = "nodejs";

type PatentGenerateRequest = {
  patentId?: string;
  componentId?: string;
  variant?: PatentImageVariant;
};

let generationQueue: Promise<void> = Promise.resolve();

function runInGenerationQueue<T>(task: () => Promise<T>): Promise<T> {
  const next = generationQueue.then(task, task);
  generationQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function isSafePatentId(value: string): boolean {
  return /^[a-z0-9-]+$/i.test(value);
}

function getComponentOrThrow(workspace: { componentLibrary: PatentComponentRecord[] }, componentId: string): PatentComponentRecord {
  const component = workspace.componentLibrary.find((item) => item.id === componentId);
  if (!component) {
    throw new Error("Component not found");
  }
  return component;
}

async function generateAsset(
  workspacePatentId: string,
  workspace: PatentWorkspaceManifest,
  component: PatentComponentRecord,
  variant: PatentImageVariant,
): Promise<PatentGeneratedImageAsset> {
  return generatePatentComponentImageVariant(workspacePatentId, workspace, component, variant);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PatentGenerateRequest;
    const patentId = body.patentId?.trim();
    const componentId = body.componentId?.trim();
    const variant = body.variant === "three_d_source" ? "three_d_source" : "realistic_display";

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    if (!componentId) {
      return Response.json({ error: "Missing componentId" }, { status: 400 });
    }

    const queuedWorkspace = updatePatentComponentImageGeneration(await readPatentWorkspaceManifest(patentId), componentId, variant, {
      status: "queued",
      error: null,
    });
    await writePatentWorkspaceManifest(queuedWorkspace);

    const updatedWorkspace = await runInGenerationQueue(async () => {
      let workspace = await readPatentWorkspaceManifest(patentId);
      const currentComponent = getComponentOrThrow(workspace, componentId);

      if (currentComponent.reviewStatus !== "approved") {
        throw new Error("Only approved canonical components can be generated.");
      }

      workspace = updatePatentComponentImageGeneration(workspace, componentId, variant, {
        status: "running",
        error: null,
      });
      await writePatentWorkspaceManifest(workspace);

      try {
        const generatedAsset = await generateAsset(patentId, workspace, getComponentOrThrow(workspace, componentId), variant);
        workspace = updatePatentComponentImageGeneration(workspace, componentId, variant, {
          status: "succeeded",
          error: null,
          asset: generatedAsset,
        });
      } catch (error) {
        workspace = updatePatentComponentImageGeneration(workspace, componentId, variant, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown generation error",
        });
      }

      await writePatentWorkspaceManifest(workspace);
      return workspace;
    });

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
    const message = error instanceof Error ? error.message : "Unknown patent generation error";
    return Response.json({ error: message }, { status: 500 });
  }
}
