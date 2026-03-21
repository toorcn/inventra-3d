import { describe, expect, it } from "vitest";
import {
  applyPatentReviewAction,
  createPatentWorkspaceManifest,
  updatePatentComponentGeneration,
  type PatentWorkspaceManifest,
} from "@/lib/patent-workspace";

function buildWorkspace(): PatentWorkspaceManifest {
  return createPatentWorkspaceManifest({
    patentId: "sample-patent",
    sourceFilename: "sample.pdf",
    totalPages: 10,
    processedPages: 3,
    extractedAt: "2026-03-22T00:00:00.000Z",
    extractedText: "sample extracted text",
    warnings: [],
    paths: {
      outputDirectory: "/patents/sample-patent",
      manifestPath: "/patents/sample-patent/manifest.json",
      textPath: "/patents/sample-patent/full-text.txt",
      candidateDirectory: "/patents/sample-patent/components/candidates",
      generatedDirectory: "/patents/sample-patent/components/generated",
    },
    figures: [
      {
        id: "fig-1",
        filename: "page-1-fig-1.png",
        imagePath: "/patents/sample-patent/page-1-fig-1.png",
        pageNumber: 1,
        label: "FIG. 1",
        description: "Overview of the writing tip assembly.",
        analysisSource: "vision",
        failureReason: null,
        cropRegion: null,
        components: [],
        pageTextSnippet: "text",
        componentDetections: [
          {
            id: "fig-1-tip",
            name: "roller ball tip",
            refNumber: "5",
            summary: "Rolling tip at the end of the pen.",
            functionDescription: "Transfers ink to the page.",
            kind: "component",
            confidence: 0.92,
            region: null,
            imageFilename: "candidate-tip.png",
            imagePath: "/patents/sample-patent/components/candidates/candidate-tip.png",
            sourceFigureId: "fig-1",
          },
          {
            id: "fig-1-seat",
            name: "tip seat",
            refNumber: "31",
            summary: "Socket supporting the rolling tip.",
            functionDescription: "Retains the tip while allowing rotation.",
            kind: "subassembly",
            confidence: 0.81,
            region: null,
            imageFilename: "candidate-seat.png",
            imagePath: "/patents/sample-patent/components/candidates/candidate-seat.png",
            sourceFigureId: "fig-1",
          },
        ],
      },
      {
        id: "fig-8",
        filename: "page-5-fig-8.png",
        imagePath: "/patents/sample-patent/page-5-fig-8.png",
        pageNumber: 5,
        label: "FIG. 8",
        description: "Detail of the writing tip.",
        analysisSource: "vision",
        failureReason: null,
        cropRegion: null,
        components: [],
        pageTextSnippet: "text",
        componentDetections: [
          {
            id: "fig-8-tip",
            name: "roller ball tip",
            refNumber: "5",
            summary: "Detailed view of the rolling tip.",
            functionDescription: "Transfers ink to the page.",
            kind: "component",
            confidence: 0.88,
            region: null,
            imageFilename: "candidate-tip-detail.png",
            imagePath: "/patents/sample-patent/components/candidates/candidate-tip-detail.png",
            sourceFigureId: "fig-8",
          },
        ],
      },
    ],
  });
}

describe("createPatentWorkspaceManifest", () => {
  it("creates multiple raw candidates from a single figure", () => {
    const workspace = buildWorkspace();
    expect(workspace.componentCandidates).toHaveLength(3);
  });

  it("collapses repeated part views into one canonical component", () => {
    const workspace = buildWorkspace();
    const tipComponent = workspace.componentLibrary.find((component) => component.refNumbers.includes("5"));

    expect(workspace.componentLibrary).toHaveLength(2);
    expect(tipComponent?.evidence).toHaveLength(2);
    expect(workspace.stats.rawCandidateCount).toBe(3);
  });
});

describe("applyPatentReviewAction", () => {
  it("merges one canonical component into another and marks the source redundant", () => {
    const workspace = buildWorkspace();
    const [first, second] = workspace.componentLibrary;
    const merged = applyPatentReviewAction(workspace, {
      type: "merge",
      componentId: second.id,
      targetComponentId: first.id,
    });

    const target = merged.componentLibrary.find((component) => component.id === first.id);
    const source = merged.componentLibrary.find((component) => component.id === second.id);

    expect(target?.evidence.length).toBeGreaterThanOrEqual(3);
    expect(source?.reviewStatus).toBe("redundant");
    expect(source?.mergeTargetId).toBe(first.id);
  });
});

describe("updatePatentComponentGeneration", () => {
  it("updates generation state without dropping generated assets", () => {
    const workspace = buildWorkspace();
    const componentId = workspace.componentLibrary[0].id;

    const generated = updatePatentComponentGeneration(workspace, componentId, {
      generationStatus: "succeeded",
      generationError: null,
      generatedAsset: {
        outputPath: "/patents/sample-patent/components/generated/tip.png",
        outputFilename: "tip.png",
        model: "gemini-3.1-flash-image-preview",
        generatedAt: "2026-03-22T00:00:00.000Z",
      },
    });

    const component = generated.componentLibrary.find((item) => item.id === componentId);
    expect(component?.generationStatus).toBe("succeeded");
    expect(component?.generatedAsset?.outputFilename).toBe("tip.png");
  });
});

