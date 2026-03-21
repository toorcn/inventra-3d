import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  enhancePatentComponentImage,
  getImageExtensionForMimeType,
  isRateLimitErrorMessage,
} from "@/lib/patent-image-enhancer";
import {
  updatePatentComponentGeneration,
  type PatentComponentRecord,
  type PatentGeneratedAsset,
  type PatentWorkspaceManifest,
} from "@/lib/patent-workspace";
import {
  ensurePatentWorkspaceDirectories,
  readPatentWorkspaceManifest,
  writePatentWorkspaceManifest,
} from "@/lib/patent-workspace-store";

export const runtime = "nodejs";

type PatentGenerateRequest = {
  patentId?: string;
  componentId?: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isSafePatentId(value: string): boolean {
  return /^[a-z0-9-]+$/i.test(value);
}

function sanitizeOutputToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getMimeTypeFromFilename(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/png";
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
): Promise<PatentGeneratedAsset> {
  const diskPaths = await ensurePatentWorkspaceDirectories(workspacePatentId);
  const evidence = [...component.evidence]
    .sort(
      (a, b) =>
        (b.qualityScore ?? 0.5) - (a.qualityScore ?? 0.5) ||
        b.confidence - a.confidence ||
        a.pageNumber - b.pageNumber,
    )
    .slice(0, 3);
  const supportingFigureIds = component.supportingContext?.supportingFigureIds ?? component.evidence.map((item) => item.figureId);
  const figureFallbackImages = workspace.figures
    .filter((figure) => supportingFigureIds.includes(figure.id))
    .slice(0, component.evidenceMode === "contextual_inferred" ? 2 : 1)
    .map((figure) => ({
      imagePath: figure.imagePath,
      imageFilename: figure.filename,
    }));
  const referenceImageSources = [...evidence, ...figureFallbackImages].slice(0, 3);
  const referenceImages = await Promise.all(
    referenceImageSources.map(async (item) => {
      const absolutePath = path.join(process.cwd(), "public", item.imagePath.replace(/^\/+/, ""));
      return {
        imageBuffer: await readFile(absolutePath),
        mimeType: getMimeTypeFromFilename(item.imageFilename),
      };
    }),
  );

  async function runGenerationAttempt(): Promise<PatentGeneratedAsset> {
    const generated = await enhancePatentComponentImage({
      canonicalName: component.canonicalName,
      canonicalLabel: component.canonicalLabel ?? component.canonicalName,
      canonicalRefNumber: component.canonicalRefNumber ?? component.refNumbers[0] ?? null,
      kind: component.kind,
      componentRole: component.role ?? "core",
      buildableStatus: component.buildableStatus ?? "buildable",
      evidenceMode: component.evidenceMode ?? "figure_context",
      inferenceStatus: component.inferenceStatus ?? "partial",
      summary: component.summary,
      functionDescription: component.functionDescription,
      refNumbers: component.refNumbers,
      supportingFigures: component.supportingContext?.supportingFigureLabels ?? component.evidence.map((item) => item.figureLabel),
      rootProductName: component.supportingContext?.rootProductName ?? component.canonicalName,
      rootProductDescription: component.supportingContext?.rootProductDescription ?? component.summary,
      parentAssemblyName: component.supportingContext?.parentAssemblyName ?? null,
      relatedComponentNames: component.supportingContext?.relatedComponentNames ?? [],
      assemblyChildRefNumbers: component.supportingContext?.assemblyChildRefNumbers ?? [],
      textSnippets: component.supportingContext?.textSnippets ?? [],
      evidencePolicyNote:
        component.supportingContext?.evidencePolicyNote ?? "Use the available patent evidence as the primary grounding.",
      referenceImages,
    });

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const outputFilename = `${sanitizeOutputToken(component.canonicalName || component.id)}-${timestamp}.${getImageExtensionForMimeType(
      generated.mimeType,
    )}`;
    const outputAbsolutePath = path.join(diskPaths.generatedAbsoluteDirectory, outputFilename);
    const outputPath = `${diskPaths.publicPaths.generatedDirectory}/${outputFilename}`;

    await writeFile(outputAbsolutePath, generated.imageBuffer);

    return {
      outputPath,
      outputFilename,
      model: generated.model,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    return await runGenerationAttempt();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    if (!isRateLimitErrorMessage(message)) {
      throw error;
    }

    await sleep(1500);
    return runGenerationAttempt();
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as PatentGenerateRequest;
    const patentId = body.patentId?.trim();
    const componentId = body.componentId?.trim();

    if (!patentId || !isSafePatentId(patentId)) {
      return Response.json({ error: "Invalid patentId" }, { status: 400 });
    }

    if (!componentId) {
      return Response.json({ error: "Missing componentId" }, { status: 400 });
    }

    const queuedWorkspace = updatePatentComponentGeneration(
      await readPatentWorkspaceManifest(patentId),
      componentId,
      {
        generationStatus: "queued",
        generationError: null,
      },
    );
    await writePatentWorkspaceManifest(queuedWorkspace);

    const updatedWorkspace = await runInGenerationQueue(async () => {
      let workspace = await readPatentWorkspaceManifest(patentId);
      const currentComponent = getComponentOrThrow(workspace, componentId);

      if (currentComponent.reviewStatus !== "approved") {
        throw new Error("Only approved canonical components can be generated.");
      }

      workspace = updatePatentComponentGeneration(workspace, componentId, {
        generationStatus: "running",
        generationError: null,
      });
      await writePatentWorkspaceManifest(workspace);

      try {
        const generatedAsset = await generateAsset(patentId, workspace, getComponentOrThrow(workspace, componentId));
        workspace = updatePatentComponentGeneration(workspace, componentId, {
          generationStatus: "succeeded",
          generationError: null,
          generatedAsset,
        });
      } catch (error) {
        workspace = updatePatentComponentGeneration(workspace, componentId, {
          generationStatus: "failed",
          generationError: error instanceof Error ? error.message : "Unknown generation error",
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
