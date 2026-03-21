import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  enhancePatentComponentImage,
  getImageExtensionForMimeType,
  isRateLimitErrorMessage,
} from "@/lib/patent-image-enhancer";
import type {
  PatentComponentRecord,
  PatentGeneratedImageAsset,
  PatentImageVariant,
  PatentWorkspaceManifest,
} from "@/lib/patent-workspace";
import { ensurePatentWorkspaceDirectories } from "@/lib/patent-workspace-store";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function generatePatentComponentImageVariant(
  workspacePatentId: string,
  workspace: PatentWorkspaceManifest,
  component: PatentComponentRecord,
  variant: PatentImageVariant,
): Promise<PatentGeneratedImageAsset> {
  const diskPaths = await ensurePatentWorkspaceDirectories(workspacePatentId);
  const maxImages = variant === "three_d_source" ? 4 : 3;
  const sortedEvidence = [...component.evidence].sort(
    (a, b) =>
      (b.qualityScore ?? 0.5) - (a.qualityScore ?? 0.5) ||
      b.confidence - a.confidence ||
      a.pageNumber - b.pageNumber,
  );

  let referenceImageSources: { imagePath: string; imageFilename: string }[];

  if (
    component.evidenceMode === "figure_context" ||
    component.evidenceMode === "contextual_inferred"
  ) {
    // Use full figure page images instead of individual crops
    const figureIds =
      component.supportingContext?.supportingFigureIds ??
      component.evidence.map((item) => item.figureId);
    const figureSources = workspace.figures
      .filter((figure) => figureIds.includes(figure.id))
      .slice(0, maxImages)
      .map((figure) => ({
        imagePath: figure.imagePath,
        imageFilename: figure.filename,
      }));

    // Fallback: if no supporting figures found, derive figure IDs from evidence
    if (figureSources.length === 0) {
      const evidenceFigureIds = [...new Set(component.evidence.map((e) => e.figureId))];
      referenceImageSources = workspace.figures
        .filter((figure) => evidenceFigureIds.includes(figure.id))
        .slice(0, maxImages)
        .map((figure) => ({
          imagePath: figure.imagePath,
          imageFilename: figure.filename,
        }));
    } else {
      referenceImageSources = figureSources;
    }
  } else {
    // Existing logic: use individual crop images, with figure pages as fallback
    const evidence = sortedEvidence.slice(0, maxImages);
    const supportingFigureIds =
      component.supportingContext?.supportingFigureIds ??
      component.evidence.map((item) => item.figureId);
    const figureFallbackImages = workspace.figures
      .filter((figure) => supportingFigureIds.includes(figure.id))
      .slice(0, component.evidenceMode === "contextual_inferred" ? 2 : 1)
      .map((figure) => ({
        imagePath: figure.imagePath,
        imageFilename: figure.filename,
      }));
    referenceImageSources = [...evidence, ...figureFallbackImages].slice(0, maxImages);
  }
  const referenceImages = await Promise.all(
    referenceImageSources.map(async (item) => {
      const absolutePath = path.join(process.cwd(), "public", item.imagePath.replace(/^\/+/, ""));
      return {
        imageBuffer: await readFile(absolutePath),
        mimeType: getMimeTypeFromFilename(item.imageFilename),
      };
    }),
  );

  async function runGenerationAttempt(): Promise<PatentGeneratedImageAsset> {
    const generated = await enhancePatentComponentImage({
      variant,
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
      scaleHints: component.scaleHints,
      referenceImages,
    });

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const outputFilename = `${sanitizeOutputToken(component.canonicalName || component.id)}-${variant}-${timestamp}.${getImageExtensionForMimeType(
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
      variant,
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
