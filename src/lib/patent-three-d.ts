import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasFalApiKey } from "@/lib/patent-image-enhancer";
import { resolveComponentPosition } from "@/lib/patent-assembly-inference";
import type {
  PatentAssemblyContract,
  PatentComponentRecord,
  PatentGeneratedImageAsset,
  PatentMeshBounds,
  PatentOrientationBasis,
  PatentThreeDAsset,
  PatentWorkspaceManifest,
  SpatialRelationship,
} from "@/lib/patent-workspace";
import { ensurePatentWorkspaceDirectories } from "@/lib/patent-workspace-store";

const FAL_TRELLIS_MODEL = "fal-ai/trellis-2";

const DEFAULT_ORIENTATION_BASIS: PatentOrientationBasis = {
  right: [1, 0, 0],
  up: [0, 1, 0],
  front: [0, 0, 1],
};

type BoundsAccumulator = {
  min: [number, number, number];
  max: [number, number, number];
};

function getFalApiKey(): string | null {
  const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  return apiKey?.trim() ? apiKey.trim() : null;
}

function buildDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function getMimeTypeFromPath(imagePath: string): string {
  const extension = path.extname(imagePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

function sanitizeOutputToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function toBounds(accumulator: BoundsAccumulator): PatentMeshBounds {
  const size: [number, number, number] = [
    accumulator.max[0] - accumulator.min[0],
    accumulator.max[1] - accumulator.min[1],
    accumulator.max[2] - accumulator.min[2],
  ];
  return {
    min: accumulator.min,
    max: accumulator.max,
    size,
    center: [
      (accumulator.min[0] + accumulator.max[0]) / 2,
      (accumulator.min[1] + accumulator.max[1]) / 2,
      (accumulator.min[2] + accumulator.max[2]) / 2,
    ],
    longestAxis: Math.max(size[0], size[1], size[2]),
  };
}

function scaleBounds(bounds: PatentMeshBounds, scale: number): PatentMeshBounds {
  return {
    min: [bounds.min[0] * scale, bounds.min[1] * scale, bounds.min[2] * scale],
    max: [bounds.max[0] * scale, bounds.max[1] * scale, bounds.max[2] * scale],
    size: [bounds.size[0] * scale, bounds.size[1] * scale, bounds.size[2] * scale],
    center: [bounds.center[0] * scale, bounds.center[1] * scale, bounds.center[2] * scale],
    longestAxis: bounds.longestAxis * scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function vectorLength(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

function inspectAccessorBounds(gltf: Record<string, unknown>, binChunk: Buffer): PatentMeshBounds {
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  const accessors = Array.isArray(gltf.accessors) ? gltf.accessors : [];
  const bufferViews = Array.isArray(gltf.bufferViews) ? gltf.bufferViews : [];
  let accumulator: BoundsAccumulator | null = null;

  for (const mesh of meshes) {
    if (!mesh || typeof mesh !== "object" || !Array.isArray((mesh as { primitives?: unknown[] }).primitives)) {
      continue;
    }

    for (const primitive of (mesh as { primitives: unknown[] }).primitives) {
      if (!primitive || typeof primitive !== "object") {
        continue;
      }

      const attributes = (primitive as { attributes?: Record<string, unknown> }).attributes;
      const positionAccessorIndex = typeof attributes?.POSITION === "number" ? attributes.POSITION : null;
      if (positionAccessorIndex == null) {
        continue;
      }

      const accessor = accessors[positionAccessorIndex] as
        | {
            bufferView?: number;
            count?: number;
            componentType?: number;
            type?: string;
            byteOffset?: number;
            min?: number[];
            max?: number[];
          }
        | undefined;
      if (!accessor || accessor.componentType !== 5126 || accessor.type !== "VEC3") {
        continue;
      }

      if (Array.isArray(accessor.min) && Array.isArray(accessor.max) && accessor.min.length >= 3 && accessor.max.length >= 3) {
        const min = [accessor.min[0], accessor.min[1], accessor.min[2]] as [number, number, number];
        const max = [accessor.max[0], accessor.max[1], accessor.max[2]] as [number, number, number];
        accumulator = accumulator
          ? {
              min: [
                Math.min(accumulator.min[0], min[0]),
                Math.min(accumulator.min[1], min[1]),
                Math.min(accumulator.min[2], min[2]),
              ],
              max: [
                Math.max(accumulator.max[0], max[0]),
                Math.max(accumulator.max[1], max[1]),
                Math.max(accumulator.max[2], max[2]),
              ],
            }
          : { min, max };
        continue;
      }

      const bufferView = typeof accessor.bufferView === "number" ? bufferViews[accessor.bufferView] : null;
      if (!bufferView || typeof bufferView !== "object") {
        continue;
      }

      const view = bufferView as { byteOffset?: number; byteStride?: number };
      const count = accessor.count ?? 0;
      const accessorByteOffset = accessor.byteOffset ?? 0;
      const viewByteOffset = view.byteOffset ?? 0;
      const stride = view.byteStride ?? 12;

      for (let index = 0; index < count; index += 1) {
        const baseOffset = viewByteOffset + accessorByteOffset + index * stride;
        if (baseOffset + 12 > binChunk.length) {
          continue;
        }
        const x = binChunk.readFloatLE(baseOffset);
        const y = binChunk.readFloatLE(baseOffset + 4);
        const z = binChunk.readFloatLE(baseOffset + 8);

        if (!accumulator) {
          accumulator = {
            min: [x, y, z],
            max: [x, y, z],
          };
          continue;
        }

        accumulator.min[0] = Math.min(accumulator.min[0], x);
        accumulator.min[1] = Math.min(accumulator.min[1], y);
        accumulator.min[2] = Math.min(accumulator.min[2], z);
        accumulator.max[0] = Math.max(accumulator.max[0], x);
        accumulator.max[1] = Math.max(accumulator.max[1], y);
        accumulator.max[2] = Math.max(accumulator.max[2], z);
      }
    }
  }

  if (!accumulator) {
    throw new Error("Unable to derive POSITION bounds from GLB mesh.");
  }

  return toBounds(accumulator);
}

export function inspectGlbBounds(glbBuffer: Buffer): PatentMeshBounds {
  if (glbBuffer.length < 20) {
    throw new Error("GLB buffer is too small.");
  }

  const magic = glbBuffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error("Invalid GLB magic header.");
  }

  let offset = 12;
  let jsonChunk: string | null = null;
  let binChunk: Buffer | null = null;

  while (offset + 8 <= glbBuffer.length) {
    const chunkLength = glbBuffer.readUInt32LE(offset);
    const chunkType = glbBuffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > glbBuffer.length) {
      throw new Error("GLB chunk length exceeds buffer size.");
    }

    if (chunkType === 0x4e4f534a) {
      jsonChunk = glbBuffer.subarray(chunkStart, chunkEnd).toString("utf8").replace(/\u0000+$/g, "");
    } else if (chunkType === 0x004e4942) {
      binChunk = glbBuffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd;
  }

  if (!jsonChunk || !binChunk) {
    throw new Error("GLB is missing JSON or BIN chunks.");
  }

  return inspectAccessorBounds(JSON.parse(jsonChunk) as Record<string, unknown>, binChunk);
}

function computeAnchorPlacement(component: PatentComponentRecord, workspace: PatentWorkspaceManifest): {
  assembledPosition: [number, number, number];
  anchorScale: { width: number | null; height: number | null };
  warnings: string[];
} {
  const heroFigureIds = new Set(
    workspace.figures.filter((figure) => figure.role === "full_product_view").map((figure) => figure.id),
  );
  const anchorRegions = component.anchorRegions.filter(
    (anchor) => anchor.region && (heroFigureIds.size === 0 || heroFigureIds.has(anchor.figureId)),
  );

  if (anchorRegions.length === 0) {
    return {
      assembledPosition: [0, 0, 0],
      anchorScale: { width: null, height: null },
      warnings: ["No hero-view anchor regions were available for this subassembly."],
    };
  }

  const centerXs = anchorRegions.map((anchor) => (anchor.region?.x ?? 0) + (anchor.region?.width ?? 0) / 2);
  const centerYs = anchorRegions.map((anchor) => (anchor.region?.y ?? 0) + (anchor.region?.height ?? 0) / 2);
  const widths = anchorRegions.map((anchor) => anchor.region?.width ?? 0).filter((value) => value > 0);
  const heights = anchorRegions.map((anchor) => anchor.region?.height ?? 0).filter((value) => value > 0);

  const avgCenterX = average(centerXs) ?? 0.5;
  const avgCenterY = average(centerYs) ?? 0.5;
  return {
    assembledPosition: [(avgCenterX - 0.5) * 1.2, (0.5 - avgCenterY) * 1.2, 0],
    anchorScale: {
      width: average(widths),
      height: average(heights),
    },
    warnings: [],
  };
}

export function buildPatentAssemblyContract(input: {
  component: PatentComponentRecord;
  workspace: PatentWorkspaceManifest;
  nativeBounds: PatentMeshBounds;
  heroComponent: PatentComponentRecord;
  inferenceData?: {
    relationships: SpatialRelationship[];
    resolvedPositions: Map<string, [number, number, number]>;
    refToComponentId: Map<string, string>;
    textDimensions: Map<string, { fractionOfHero: number }>;
  };
}): PatentAssemblyContract {
  const { component, workspace, nativeBounds, heroComponent, inferenceData } = input;
  if (!Number.isFinite(nativeBounds.longestAxis) || nativeBounds.longestAxis <= 0) {
    throw new Error("Mesh bounds are empty or invalid.");
  }

  const warnings: string[] = [];
  const isHero = component.id === heroComponent.id;
  const heroArea = heroComponent.scaleHints?.relativeArea ?? 0;
  const componentArea = component.scaleHints?.relativeArea ?? 0;
  const expectedLinearScale =
    isHero || heroArea <= 0 || componentArea <= 0 ? 1 : Math.sqrt(componentArea / heroArea);
  const unclampedNormalizedLongestAxis = isHero ? 1 : expectedLinearScale;
  const normalizedLongestAxis = isHero ? 1 : clamp(unclampedNormalizedLongestAxis, 0.02, 0.95);

  if (!isHero && Math.abs(normalizedLongestAxis - unclampedNormalizedLongestAxis) > 0.0001) {
    warnings.push("Normalized subassembly scale was clamped to stay within the hero envelope sanity range.");
  }

  const normalizedScale = normalizedLongestAxis / nativeBounds.longestAxis;
  const normalizedBounds = scaleBounds(nativeBounds, normalizedScale);
  let assembledPosition: [number, number, number] = [0, 0, 0];
  let placementTier: 1 | 2 | 3 = 1;
  let anchorScale: { width: number | null; height: number | null } = { width: null, height: null };

  if (isHero) {
    assembledPosition = [0, 0, 0];
    placementTier = 1;
  } else if (inferenceData) {
    // Use inference engine for non-hero components
    const posResult = resolveComponentPosition({
      componentId: component.id,
      anchorRegions: component.anchorRegions ?? [],
      heroFigureIds: workspace.figures.filter(f => f.role === "full_product_view").map(f => f.id),
      relationships: inferenceData.relationships.filter(r => r.ref === component.canonicalRefNumber),
      resolvedPositions: inferenceData.resolvedPositions,
      refToComponentId: inferenceData.refToComponentId,
      parentComponentId: component.parentAssemblyId ?? null,
      componentKind: component.kind,
    });

    assembledPosition = posResult.position;
    placementTier = posResult.tier;
  } else {
    // Fallback: existing anchor-only logic
    const placement = computeAnchorPlacement(component, workspace);
    assembledPosition = placement.assembledPosition;
    anchorScale = placement.anchorScale;
    placementTier = placement.assembledPosition[0] === 0 && placement.assembledPosition[1] === 0 && placement.assembledPosition[2] === 0 && placement.warnings.length > 0 ? 3 : 1;
    warnings.push(...placement.warnings);
  }

  if (!isHero && normalizedBounds.longestAxis < 0.02) {
    warnings.push("Scaled subassembly is implausibly small relative to the hero.");
  }
  if (!isHero && normalizedBounds.longestAxis > 0.95) {
    warnings.push("Scaled subassembly is implausibly large relative to the hero.");
  }

  if (!isHero && anchorScale.width && normalizedBounds.size[0] > 0) {
    const widthRatio = Math.max(normalizedBounds.size[0], anchorScale.width) / Math.max(0.0001, Math.min(normalizedBounds.size[0], anchorScale.width));
    if (widthRatio > 2.5) {
      warnings.push("Projected mesh width differs significantly from patent anchor-region width.");
    }
  }

  if (!isHero && anchorScale.height && normalizedBounds.size[1] > 0) {
    const heightRatio = Math.max(normalizedBounds.size[1], anchorScale.height) / Math.max(0.0001, Math.min(normalizedBounds.size[1], anchorScale.height));
    if (heightRatio > 2.5) {
      warnings.push("Projected mesh height differs significantly from patent anchor-region height.");
    }
  }

  const [assembledX, assembledY, assembledZ] = assembledPosition;
  const directionLength = vectorLength(assembledX, assembledY, assembledZ);
  const explodedMagnitude = isHero ? 0 : 0.35 + normalizedBounds.longestAxis * 0.6;
  const explodedOffset: [number, number, number] =
    isHero
      ? [0, 0, 0]
      : directionLength < 0.001
        ? [0, explodedMagnitude, 0]
        : [
            (assembledX / directionLength) * explodedMagnitude,
            (assembledY / directionLength) * explodedMagnitude,
            (assembledZ / Math.max(directionLength, 1)) * explodedMagnitude,
          ];

  return {
    componentId: component.id,
    role: isHero ? "hero" : "subassembly",
    parentAssemblyId: component.parentAssemblyId,
    nativeBounds,
    normalizedBounds,
    normalizedScale,
    expectedLinearScale: isHero ? 1 : expectedLinearScale,
    assembledPosition,
    explodedOffset,
    fitStatus: warnings.length === 0 ? "pass" : "warn",
    fitWarnings: warnings,
    placementTier,
    orientationBasis: DEFAULT_ORIENTATION_BASIS,
  };
}

export async function generatePatentThreeDAsset(input: {
  patentId: string;
  component: PatentComponentRecord;
  sourceImage: PatentGeneratedImageAsset;
}): Promise<{ asset: PatentThreeDAsset; glbBuffer: Buffer }> {
  const apiKey = getFalApiKey();
  if (!apiKey || !hasFalApiKey()) {
    throw new Error("FAL_KEY is missing. Add it to enable fal.ai Trellis 2 generation.");
  }

  const sourceAbsolutePath = path.join(process.cwd(), "public", input.sourceImage.outputPath.replace(/^\/+/, ""));
  const sourceBuffer = await readFile(sourceAbsolutePath);
  const sourceMimeType = getMimeTypeFromPath(input.sourceImage.outputPath);

  const response = await fetch(`https://fal.run/${FAL_TRELLIS_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: buildDataUri(sourceBuffer, sourceMimeType),
      resolution: 1024,
      texture_size: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fal.ai Trellis 2 generation failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    requestId?: string;
    model_glb?: { url?: string };
    model_mesh?: { url?: string };
  };
  const requestId = response.headers.get("x-fal-request-id") ?? payload.requestId ?? `trellis-${Date.now()}`;
  const outputUrl = payload.model_glb?.url ?? payload.model_mesh?.url;
  if (!outputUrl) {
    throw new Error("fal.ai Trellis 2 returned no GLB output.");
  }

  const glbResponse = await fetch(outputUrl);
  if (!glbResponse.ok) {
    throw new Error(`fal.ai GLB download failed (${glbResponse.status}).`);
  }

  const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());
  const diskPaths = await ensurePatentWorkspaceDirectories(input.patentId);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const outputFilename = `${sanitizeOutputToken(input.component.canonicalName || input.component.id)}-${timestamp}.glb`;
  const outputAbsolutePath = path.join(diskPaths.threeDAbsoluteDirectory, outputFilename);
  const outputPath = `${diskPaths.publicPaths.threeDDirectory}/${outputFilename}`;
  await writeFile(outputAbsolutePath, glbBuffer);

  return {
    asset: {
      outputPath,
      outputFilename,
      provider: "fal",
      model: "fal-ai/trellis-2",
      requestId,
      sourceImageVariant: "three_d_source",
      generatedAt: new Date().toISOString(),
    },
    glbBuffer,
  };
}
