import { describe, expect, it } from "vitest";
import { buildPatentAssemblyContract, inspectGlbBounds } from "@/lib/patent-three-d";
import { createPatentWorkspaceManifest, type PatentWorkspaceManifest } from "@/lib/patent-workspace";

function createTestGlb(): Buffer {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-1, -2, -3],
        max: [4, 5, 6],
      },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  });

  const jsonBuffer = Buffer.from(json, "utf8");
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
  const binChunk = Buffer.alloc(36);
  const totalLength = 12 + 8 + paddedJson.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(paddedJson.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  return Buffer.concat([header, jsonHeader, paddedJson, binHeader, binChunk]);
}

function buildWorkspace(): PatentWorkspaceManifest {
  return createPatentWorkspaceManifest({
    patentId: "three-d-test",
    sourceFilename: "sample.pdf",
    totalPages: 1,
    processedPages: 1,
    extractedAt: "2026-03-22T00:00:00.000Z",
    extractedText: "sample extracted text",
    warnings: [],
    capabilities: {
      imageGeneration: true,
      threeDGeneration: true,
    },
    paths: {
      outputDirectory: "/patents/three-d-test",
      manifestPath: "/patents/three-d-test/manifest.json",
      textPath: "/patents/three-d-test/full-text.txt",
      candidateDirectory: "/patents/three-d-test/components/candidates",
      generatedDirectory: "/patents/three-d-test/components/generated",
      threeDDirectory: "/patents/three-d-test/components/3d",
    },
    figures: [
      {
        id: "fig-1",
        filename: "page-1-fig-1.png",
        imagePath: "/patents/three-d-test/page-1-fig-1.png",
        pageNumber: 1,
        label: "FIG. 1",
        description: "Overall product view.",
        role: "full_product_view",
        relationToRootProduct: "Shows the overall product.",
        assemblyHint: "Root product view",
        analysisSource: "vision",
        failureReason: null,
        cropRegion: null,
        components: [],
        pageTextSnippet: "text",
        componentDetections: [
          {
            id: "hero",
            name: "tip assembly",
            refNumber: "31",
            summary: "Overall tip assembly.",
            functionDescription: "Supports the writing point.",
            kind: "full_product",
            confidence: 0.92,
            region: { x: 0.2, y: 0.15, width: 0.5, height: 0.7 },
            imageFilename: "hero.png",
            imagePath: "/patents/three-d-test/components/candidates/hero.png",
            sourceFigureId: "fig-1",
            scaleHints: { normalizedWidth: 0.5, normalizedHeight: 0.7, relativeArea: 0.35 },
          },
          {
            id: "sub",
            name: "ball retention geometry",
            refNumber: "32",
            summary: "Subassembly around the ball seat.",
            functionDescription: "Retains the ball at the tip.",
            kind: "subassembly",
            confidence: 0.88,
            region: { x: 0.3, y: 0.35, width: 0.18, height: 0.22 },
            imageFilename: "sub.png",
            imagePath: "/patents/three-d-test/components/candidates/sub.png",
            sourceFigureId: "fig-1",
            scaleHints: { normalizedWidth: 0.18, normalizedHeight: 0.22, relativeArea: 0.0396 },
          },
        ],
      },
    ],
  });
}

describe("inspectGlbBounds", () => {
  it("derives native bounds from a minimal GLB", () => {
    const bounds = inspectGlbBounds(createTestGlb());
    expect(bounds.size).toEqual([5, 7, 9]);
    expect(bounds.longestAxis).toBe(9);
  });
});

describe("buildPatentAssemblyContract", () => {
  it("normalizes hero and subassembly scale using patent scale hints", () => {
    const workspace = buildWorkspace();
    const hero = workspace.componentLibrary.find((component) => component.kind === "full_product");
    const subassembly = workspace.componentLibrary.find((component) => component.kind === "subassembly");
    if (!hero || !subassembly) {
      throw new Error("Expected hero and subassembly records.");
    }

    const heroContract = buildPatentAssemblyContract({
      component: hero,
      workspace,
      nativeBounds: {
        min: [-1, -1, -1],
        max: [1, 2, 3],
        size: [2, 3, 4],
        center: [0, 0.5, 1],
        longestAxis: 4,
      },
      heroComponent: hero,
    });
    const subassemblyContract = buildPatentAssemblyContract({
      component: subassembly,
      workspace,
      nativeBounds: {
        min: [-0.5, -0.5, -0.5],
        max: [0.5, 0.5, 0.5],
        size: [1, 1, 1],
        center: [0, 0, 0],
        longestAxis: 1,
      },
      heroComponent: hero,
    });

    expect(heroContract.normalizedBounds.longestAxis).toBeCloseTo(1, 5);
    expect(subassemblyContract.expectedLinearScale).toBeCloseTo(Math.sqrt(0.0396 / 0.35), 5);
    expect(subassemblyContract.assembledPosition[0]).not.toBe(0);
  });
});
