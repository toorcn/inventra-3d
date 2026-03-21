import { generatePatentComponentImageVariant } from "@/lib/patent-component-image-generator";
import { inferSpatialRelationships } from "@/lib/patent-assembly-inference";
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

function isFeaturedGeneratableComponent(workspace: PatentWorkspaceManifest, componentId: string): boolean {
  return listFeaturedComponentIds(workspace).includes(componentId);
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

    if (mode === "component" && componentId) {
      const component = getComponentOrThrow(workspace, componentId);
      if (component.reviewStatus !== "approved" && !isFeaturedGeneratableComponent(workspace, componentId)) {
        return Response.json(
          {
            error: "This component is still too ambiguous for standalone 3D generation. Use the featured set or approve it first.",
          },
          { status: 400 },
        );
      }

      if (component.threeDAsset && !forceRegenerate) {
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
    }

    for (const targetId of targetComponentIds) {
      workspace = updatePatentComponentThreeD(workspace, targetId, {
        threeDStatus: "queued",
        threeDError: null,
      });
    }
    await writePatentWorkspaceManifest(workspace);

    void runInGenerationQueue(async () => {
      let currentWorkspace = await readPatentWorkspaceManifest(patentId);
      const heroComponentId = currentWorkspace.featured.heroComponentId;

      // Gather target components for inference
      const targetComponents = targetComponentIds
        .map(id => currentWorkspace.componentLibrary.find(c => c.id === id))
        .filter((c): c is PatentComponentRecord => c !== undefined);

      // Run assembly inference once for all components
      const inferenceInput = {
        components: targetComponents.map(c => ({
          ref: c.canonicalRefNumber ?? c.id,
          name: c.canonicalName,
          kind: c.kind,
        })),
        patentText: currentWorkspace.extractedText ?? "",
        assemblyGraph: heroComponentId
          ? {
              heroRef: currentWorkspace.componentLibrary.find(c => c.id === heroComponentId)?.canonicalRefNumber ?? heroComponentId,
              children: targetComponents.filter(c => c.id !== heroComponentId).map(c => c.canonicalRefNumber ?? c.id),
            }
          : null,
      };

      let inferenceResult: { relationships: Array<{ ref: string; relation: 'between' | 'through' | 'attached_to' | 'inside' | 'adjacent' | 'surrounds'; targets: string[]; axis?: 'x' | 'y' | 'z'; side?: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back'; offset?: number }>; textDimensions: Array<{ ref: string; fractionOfHero: number }> };
      try {
        inferenceResult = await inferSpatialRelationships(inferenceInput);
      } catch {
        inferenceResult = { relationships: [], textDimensions: [] };
      }

      // Build lookup maps
      const refToComponentId = new Map<string, string>();
      for (const c of targetComponents) {
        if (c.canonicalRefNumber) refToComponentId.set(c.canonicalRefNumber, c.id);
      }
      const resolvedPositions = new Map<string, [number, number, number]>();
      const textDimensionMap = new Map<string, { fractionOfHero: number }>();
      for (const td of inferenceResult.textDimensions) {
        textDimensionMap.set(td.ref, { fractionOfHero: td.fractionOfHero });
      }

      const inferenceData = {
        relationships: inferenceResult.relationships,
        resolvedPositions,
        refToComponentId,
        textDimensions: textDimensionMap,
      };

      for (const targetId of targetComponentIds) {
        let component = getComponentOrThrow(currentWorkspace, targetId);
        if (component.reviewStatus !== "approved" && !isFeaturedGeneratableComponent(currentWorkspace, targetId)) {
          currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
            threeDStatus: "failed",
            threeDError: "This component is still too ambiguous for standalone 3D generation.",
          });
          await writePatentWorkspaceManifest(currentWorkspace);
          continue;
        }

        if (component.threeDAsset && !forceRegenerate) {
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

          const heroComponent = heroComponentId ? getComponentOrThrow(currentWorkspace, heroComponentId) : component;

          if (component.id !== heroComponent.id && !heroComponent.threeDAsset) {
            throw new Error("Generate the featured hero mesh first so subassemblies can normalize against it.");
          }

          // Generate GLB with retry-once logic
          let glbResult: { asset: Awaited<ReturnType<typeof generatePatentThreeDAsset>>["asset"]; glbBuffer: Buffer } | null = null;
          try {
            glbResult = await generatePatentThreeDAsset({
              patentId,
              component,
              sourceImage,
            });
          } catch {
            try {
              glbResult = await generatePatentThreeDAsset({
                patentId,
                component,
                sourceImage,
              });
            } catch {
              glbResult = null;
            }
          }

          if (glbResult) {
            const nativeBounds = inspectGlbBounds(glbResult.glbBuffer);

            const assemblyContract = buildPatentAssemblyContract({
              component,
              workspace: currentWorkspace,
              nativeBounds,
              heroComponent,
              inferenceData,
            });

            // Store resolved position for subsequent components (Tier 2 inference)
            resolvedPositions.set(component.id, assemblyContract.assembledPosition);

            currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
              threeDStatus: "succeeded",
              threeDError: null,
              threeDAsset: glbResult.asset,
              assemblyContract,
            });
          } else {
            // GLB generation failed but we can still build a contract with fallback bounds
            const fallbackBounds = {
              min: [-0.5, -0.5, -0.5] as [number, number, number],
              max: [0.5, 0.5, 0.5] as [number, number, number],
              size: [1, 1, 1] as [number, number, number],
              center: [0, 0, 0] as [number, number, number],
              longestAxis: 1,
            };

            const assemblyContract = buildPatentAssemblyContract({
              component,
              workspace: currentWorkspace,
              nativeBounds: fallbackBounds,
              heroComponent,
              inferenceData,
            });
            assemblyContract.fitWarnings.push("glb_generation_failed");
            assemblyContract.fitStatus = "warn";

            resolvedPositions.set(component.id, assemblyContract.assembledPosition);

            currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
              threeDStatus: "failed",
              threeDError: "GLB generation failed after retry.",
              assemblyContract,
            });
          }
        } catch (error) {
          currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
            threeDStatus: "failed",
            threeDError: error instanceof Error ? error.message : "Unknown 3D generation error",
          });
        }

        await writePatentWorkspaceManifest(currentWorkspace);
      }

      return currentWorkspace;
    }).catch(async (error) => {
      let currentWorkspace = await readPatentWorkspaceManifest(patentId);
      for (const targetId of targetComponentIds) {
        const component = currentWorkspace.componentLibrary.find((item) => item.id === targetId);
        if (!component) {
          continue;
        }
        if (component.threeDStatus === "succeeded") {
          continue;
        }
        currentWorkspace = updatePatentComponentThreeD(currentWorkspace, targetId, {
          threeDStatus: "failed",
          threeDError: error instanceof Error ? error.message : "Unknown background 3D generation error",
        });
      }
      await writePatentWorkspaceManifest(currentWorkspace);
    });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown patent 3D generation error";
    return Response.json({ error: message }, { status: 500 });
  }
}
