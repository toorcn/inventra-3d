import { generatePatentComponentImageVariant } from "@/lib/patent-component-image-generator";
import { hasFalApiKey } from "@/lib/patent-image-enhancer";
import {
  buildPatentAssemblyContract,
  generatePatentThreeDAsset,
  inspectGlbBounds,
} from "@/lib/patent-three-d";
import {
  getPatentComponentImageAsset,
  updatePatentComponentImageGeneration,
  updatePatentComponentThreeD,
  type PatentComponentRecord,
  type PatentWorkspaceManifest,
} from "@/lib/patent-workspace";
import { readPatentWorkspaceManifest, writePatentWorkspaceManifest } from "@/lib/patent-workspace-store";

export const runtime = "nodejs";

type PatentThreeDGenerateRequest = {
  patentId?: string;
  mode?: "featured-set" | "component";
  componentId?: string;
  forceRegenerate?: boolean;
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

function getComponentOrThrow(workspace: PatentWorkspaceManifest, componentId: string): PatentComponentRecord {
  const component = workspace.componentLibrary.find((item) => item.id === componentId);
  if (!component) {
    throw new Error("Component not found.");
  }
  return component;
}

function listFeaturedComponentIds(workspace: PatentWorkspaceManifest): string[] {
  const componentIds: string[] = [];
  if (workspace.featured.heroComponentId) {
    componentIds.push(workspace.featured.heroComponentId);
  }

  for (const assemblyId of workspace.featured.subassemblyAssemblyIds) {
    const assembly = workspace.assemblies.find((item) => item.id === assemblyId);
    if (assembly?.representativeComponentId) {
      componentIds.push(assembly.representativeComponentId);
    }
  }

  return Array.from(new Set(componentIds));
}

async function ensureThreeDSourceImage(
  patentId: string,
  workspace: PatentWorkspaceManifest,
  component: PatentComponentRecord,
  forceRegenerate: boolean,
): Promise<PatentWorkspaceManifest> {
  const currentAsset = getPatentComponentImageAsset(component, "three_d_source");
  if (currentAsset && !forceRegenerate) {
    return workspace;
  }

  let nextWorkspace = updatePatentComponentImageGeneration(workspace, component.id, "three_d_source", {
    status: "running",
    error: null,
  });
  await writePatentWorkspaceManifest(nextWorkspace);

  try {
    const generatedAsset = await generatePatentComponentImageVariant(patentId, nextWorkspace, component, "three_d_source");
    nextWorkspace = updatePatentComponentImageGeneration(nextWorkspace, component.id, "three_d_source", {
      status: "succeeded",
      error: null,
      asset: generatedAsset,
    });
  } catch (error) {
    nextWorkspace = updatePatentComponentImageGeneration(nextWorkspace, component.id, "three_d_source", {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown 3D source generation error",
    });
    await writePatentWorkspaceManifest(nextWorkspace);
    throw error;
  }

  await writePatentWorkspaceManifest(nextWorkspace);
  return nextWorkspace;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PatentThreeDGenerateRequest;
    const patentId = body.patentId?.trim();
    const mode = body.mode === "component" ? "component" : "featured-set";
    const componentId = body.componentId?.trim();
    const forceRegenerate = Boolean(body.forceRegenerate);

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    if (mode === "component" && !componentId) {
      return Response.json({ error: "Missing componentId" }, { status: 400 });
    }

    if (!hasFalApiKey()) {
      return Response.json({ error: "FAL_KEY is missing. 3D generation is unavailable." }, { status: 400 });
    }

    let workspace = await readPatentWorkspaceManifest(patentId);
    const targetComponentIds =
      mode === "component"
        ? componentId
          ? [componentId]
          : []
        : listFeaturedComponentIds(workspace).filter((id) => {
            const component = workspace.componentLibrary.find((item) => item.id === id);
            if (!component) {
              return false;
            }
            return forceRegenerate || !component.threeDAsset;
          });

    if (targetComponentIds.length === 0) {
      return Response.json(
        {
          workspace,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    for (const targetId of targetComponentIds) {
      workspace = updatePatentComponentThreeD(workspace, targetId, {
        threeDStatus: "queued",
        threeDError: null,
      });
    }
    await writePatentWorkspaceManifest(workspace);

    const updatedWorkspace = await runInGenerationQueue(async () => {
      let currentWorkspace = await readPatentWorkspaceManifest(patentId);
      const heroComponentId = currentWorkspace.featured.heroComponentId;

      for (const targetId of targetComponentIds) {
        let component = getComponentOrThrow(currentWorkspace, targetId);
        if (component.reviewStatus !== "approved") {
          currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
            threeDStatus: "failed",
            threeDError: "Only approved components can be converted to 3D.",
          });
          await writePatentWorkspaceManifest(currentWorkspace);
          continue;
        }

        currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
          threeDStatus: "running",
          threeDError: null,
        });
        await writePatentWorkspaceManifest(currentWorkspace);

        try {
          currentWorkspace = await ensureThreeDSourceImage(patentId, currentWorkspace, component, forceRegenerate);
          component = getComponentOrThrow(currentWorkspace, targetId);
          const sourceImage = getPatentComponentImageAsset(component, "three_d_source");
          if (!sourceImage) {
            throw new Error("No 3D-source image was available for Trellis conversion.");
          }

          const { asset, glbBuffer } = await generatePatentThreeDAsset({
            patentId,
            component,
            sourceImage,
          });
          const nativeBounds = inspectGlbBounds(glbBuffer);
          const heroComponent = heroComponentId ? getComponentOrThrow(currentWorkspace, heroComponentId) : component;

          if (component.id !== heroComponent.id && !heroComponent.threeDAsset) {
            throw new Error("Generate the featured hero mesh first so subassemblies can normalize against it.");
          }

          const assemblyContract = buildPatentAssemblyContract({
            component,
            workspace: currentWorkspace,
            nativeBounds,
            heroComponent,
          });

          currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
            threeDStatus: "succeeded",
            threeDError: null,
            threeDAsset: asset,
            assemblyContract,
          });
        } catch (error) {
          currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
            threeDStatus: "failed",
            threeDError: error instanceof Error ? error.message : "Unknown 3D generation error",
          });
        }

        await writePatentWorkspaceManifest(currentWorkspace);
      }

      return currentWorkspace;
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
    const message = error instanceof Error ? error.message : "Unknown patent 3D generation error";
    return Response.json({ error: message }, { status: 500 });
  }
}
